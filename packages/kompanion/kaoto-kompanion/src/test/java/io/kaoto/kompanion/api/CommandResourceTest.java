package io.kaoto.kompanion.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.kaoto.kompanion.worker.WorkerProtocol;
import io.kaoto.kompanion.worker.WorkerRegistry;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@QuarkusTest
class CommandResourceTest {

    @Inject
    WorkerRegistry registry;

    @Test
    void postCommandToUnknownExecutionReturns404() {
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"r1\"}")
                .when()
                .post("/v1/executions/no-such-exec/commands")
                .then()
                .statusCode(404);
    }

    @Test
    void postMalformedCommandReturns400() {
        given().contentType("application/json")
                .body("{\"type\":\"unknown.command.type\"}")
                .when()
                .post("/v1/executions/any-exec/commands")
                .then()
                .statusCode(400);
    }

    @Test
    void postCommandReturns200WhenAckArrivesWithinTimeout() throws Exception {
        String executionId = "cmd-test-ack";
        registry.register(executionId, "test-conn-ack", frame -> {
            try {
                var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                var node = mapper.readTree(frame);
                String correlationId = node.path("correlationId").asText();
                new Thread(() -> {
                            try {
                                Thread.sleep(50);
                            } catch (InterruptedException ignored) {
                            }
                            registry.receiveAck(executionId, correlationId, true, "started");
                        })
                        .start();
            } catch (Exception ignored) {
            }
        });
        registry.protocolDetected(executionId, "test-conn-ack", WorkerProtocol.BRIDGE);

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"my-route\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .body("status", is("acked"))
                .body("success", is(true))
                .body("correlationId", notNullValue());

        registry.unregister(executionId, "test-conn-ack");
    }

    @Test
    void postCommandIsEncodedAsConnectorActionAndResultIsAcked() throws Exception {
        String executionId = "cmd-test-connector";
        var sent = new java.util.concurrent.atomic.AtomicReference<String>();
        registry.register(executionId, "test-conn-connector", frame -> {
            sent.set(frame);
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(frame);
                String requestId = node.path("requestId").asText();
                new Thread(() -> registry.receiveAck(executionId, requestId, false, "No route matching: nope")).start();
            } catch (Exception ignored) {
            }
        });
        registry.protocolDetected(executionId, "test-conn-connector", WorkerProtocol.CONNECTOR);

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"nope\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .body("status", is("failed"))
                .body("detail", is("No route matching: nope"));

        var frame = new com.fasterxml.jackson.databind.ObjectMapper().readTree(sent.get());
        org.junit.jupiter.api.Assertions.assertEquals(1, frame.path("v").asInt());
        org.junit.jupiter.api.Assertions.assertEquals(
                "action", frame.path("type").asText());
        org.junit.jupiter.api.Assertions.assertEquals(
                "route", frame.path("action").path("action").asText());
        org.junit.jupiter.api.Assertions.assertEquals(
                "start", frame.path("action").path("command").asText());
        org.junit.jupiter.api.Assertions.assertEquals(
                "nope", frame.path("action").path("id").asText());

        registry.unregister(executionId, "test-conn-connector");
    }

    @Test
    void postCommandReturns202WhenTimeoutExceeded() {
        String executionId = "cmd-test-timeout";
        registry.register(executionId, "test-conn-timeout", frame -> {});
        registry.protocolDetected(executionId, "test-conn-timeout", WorkerProtocol.BRIDGE);

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.stop\",\"routeId\":\"my-route\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(202)
                .body("correlationId", notNullValue())
                .body("status", is("pending"));

        registry.unregister(executionId, "test-conn-timeout");
    }

    @Test
    void getCommandResultReturnsPendingWhenNotYetAcked() {
        String executionId = "cmd-poll-pending";
        registry.register(executionId, "test-conn-poll-pending", frame -> {});
        String correlationId = java.util.UUID.randomUUID().toString();
        registry.sendCommand(executionId, correlationId, "{}");

        given().when()
                .get("/v1/executions/" + executionId + "/commands/" + correlationId)
                .then()
                .statusCode(200)
                .body("status", is("pending"));

        registry.unregister(executionId, "test-conn-poll-pending");
    }

    @Test
    void getCommandResultReturnsAckedAfterAck() {
        String executionId = "cmd-poll-acked";
        registry.register(executionId, "test-conn-poll-acked", frame -> {});
        String correlationId = java.util.UUID.randomUUID().toString();
        registry.sendCommand(executionId, correlationId, "{}");
        registry.receiveAck(executionId, correlationId, true, "ok");

        given().when()
                .get("/v1/executions/" + executionId + "/commands/" + correlationId)
                .then()
                .statusCode(200)
                .body("status", is("acked"))
                .body("success", is(true));

        registry.unregister(executionId, "test-conn-poll-acked");
    }

    @Test
    void getCommandResultReturns404ForUnknownCorrelationId() {
        given().when()
                .get("/v1/executions/any-exec/commands/no-such-corr")
                .then()
                .statusCode(404);
    }
}
