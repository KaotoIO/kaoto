package io.kaoto.companion.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

import io.kaoto.companion.worker.WorkerRegistry;
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
        registry.register(executionId, frame -> {
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

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"my-route\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .body("status", is("acked"))
                .body("success", is(true))
                .body("correlationId", notNullValue());

        registry.unregister(executionId);
    }

    @Test
    void postCommandReturns202WhenTimeoutExceeded() {
        String executionId = "cmd-test-timeout";
        registry.register(executionId, frame -> {});

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.stop\",\"routeId\":\"my-route\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(202)
                .body("correlationId", notNullValue())
                .body("status", is("pending"));

        registry.unregister(executionId);
    }

    @Test
    void getCommandResultReturnsPendingWhenNotYetAcked() {
        String executionId = "cmd-poll-pending";
        registry.register(executionId, frame -> {});
        String correlationId = java.util.UUID.randomUUID().toString();
        registry.sendCommand(executionId, correlationId, "{}");

        given().when()
                .get("/v1/executions/" + executionId + "/commands/" + correlationId)
                .then()
                .statusCode(200)
                .body("status", is("pending"));

        registry.unregister(executionId);
    }

    @Test
    void getCommandResultReturnsAckedAfterAck() {
        String executionId = "cmd-poll-acked";
        registry.register(executionId, frame -> {});
        String correlationId = java.util.UUID.randomUUID().toString();
        registry.sendCommand(executionId, correlationId, "{}");
        registry.receiveAck(executionId, correlationId, true, "ok");

        given().when()
                .get("/v1/executions/" + executionId + "/commands/" + correlationId)
                .then()
                .statusCode(200)
                .body("status", is("acked"))
                .body("success", is(true));

        registry.unregister(executionId);
    }

    @Test
    void getCommandResultReturns404ForUnknownCorrelationId() {
        given().when()
                .get("/v1/executions/any-exec/commands/no-such-corr")
                .then()
                .statusCode(404);
    }
}
