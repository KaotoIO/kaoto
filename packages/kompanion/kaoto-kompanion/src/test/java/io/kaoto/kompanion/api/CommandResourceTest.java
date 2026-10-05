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

    @Test
    void postCommandBeforeProtocolDetectionReturns503AndLaterCommandsStillWork() {
        String executionId = "cmd-test-protocol-wait";
        registry.register(executionId, "test-conn-protocol", frame -> {
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(frame);
                String correlationId = node.path("correlationId").asText();
                new Thread(() -> registry.receiveAck(executionId, correlationId, true, "started")).start();
            } catch (Exception ignored) {
            }
        });

        // the worker has not sent its first frame: the command waits protocol-timeout and gives up
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"r1\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(503);

        // the timed-out wait must not have poisoned the shared protocol future
        registry.protocolDetected(executionId, "test-conn-protocol", WorkerProtocol.BRIDGE);
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"r1\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .body("status", is("acked"));

        registry.unregister(executionId, "test-conn-protocol");
    }

    @Test
    void connectorActionIsPassedThroughAsIs() throws Exception {
        String executionId = "cmd-test-connector-action";
        var sent = new java.util.concurrent.atomic.AtomicReference<String>();
        registry.register(executionId, "test-conn-action", frame -> {
            sent.set(frame);
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(frame);
                String requestId = node.path("requestId").asText();
                new Thread(() -> registry.receiveAck(executionId, requestId, true, "ok")).start();
            } catch (Exception ignored) {
            }
        });
        registry.protocolDetected(executionId, "test-conn-action", WorkerProtocol.CONNECTOR);
        registry.camelVersionDetected(executionId, "4.18.4");

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.connector.action\","
                        + "\"action\":{\"action\":\"route-dump\",\"filter\":\"*\",\"format\":\"yaml\"}}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .body("status", is("acked"));

        var action = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(sent.get())
                .path("action");
        org.junit.jupiter.api.Assertions.assertEquals(
                "route-dump", action.path("action").asText());
        org.junit.jupiter.api.Assertions.assertEquals("*", action.path("filter").asText());
        org.junit.jupiter.api.Assertions.assertEquals(
                "yaml", action.path("format").asText());

        registry.unregister(executionId, "test-conn-action");
    }

    @Test
    void commandsTheWorkerCannotRunAreRejectedWithoutBeingSent() {
        String executionId = "cmd-test-unsupported";
        var sent = new java.util.concurrent.atomic.AtomicBoolean();
        registry.register(executionId, "test-conn-unsupported", frame -> sent.set(true));
        registry.protocolDetected(executionId, "test-conn-unsupported", WorkerProtocol.CONNECTOR);
        registry.camelVersionDetected(executionId, "4.18.4");

        // added in 4.21
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.connector.action\",\"action\":{\"action\":\"route-topology\"}}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(422)
                .body("error", containsString("4.18.4"));
        // 4.18 would send the base64 text as the body
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:a\",\"body\":\"aGk=\","
                        + "\"bodyEncoding\":\"base64\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(422);
        org.junit.jupiter.api.Assertions.assertFalse(sent.get());

        registry.unregister(executionId, "test-conn-unsupported");
    }

    @Test
    void connectorActionIsRejectedForTheBridge() {
        String executionId = "cmd-test-action-bridge";
        registry.register(executionId, "test-conn-action-bridge", frame -> {});
        registry.protocolDetected(executionId, "test-conn-action-bridge", WorkerProtocol.BRIDGE);

        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.connector.action\",\"action\":{\"action\":\"reset-stats\"}}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(422);

        registry.unregister(executionId, "test-conn-action-bridge");
    }

    @Test
    void connectorActionWithoutActionNameIsRejected() {
        given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.connector.action\",\"action\":{\"filter\":\"*\"}}")
                .when()
                .post("/v1/executions/any-exec/commands")
                .then()
                .statusCode(400);
    }

    @Test
    void resultAnsweredRightAwayIsNotKept() throws Exception {
        String executionId = "cmd-test-forget";
        registry.register(executionId, "test-conn-forget", frame -> {
            try {
                var node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(frame);
                String correlationId = node.path("correlationId").asText();
                new Thread(() -> registry.receiveAck(executionId, correlationId, true, "started")).start();
            } catch (Exception ignored) {
            }
        });
        registry.protocolDetected(executionId, "test-conn-forget", WorkerProtocol.BRIDGE);

        String correlationId = given().contentType("application/json")
                .body("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"r1\"}")
                .when()
                .post("/v1/executions/" + executionId + "/commands")
                .then()
                .statusCode(200)
                .extract()
                .path("correlationId");

        // one result per command for the lifetime of the execution filled the heap (soak: 70 MB in 30 s)
        given().when()
                .get("/v1/executions/" + executionId + "/commands/" + correlationId)
                .then()
                .statusCode(404);

        registry.unregister(executionId, "test-conn-forget");
    }
}
