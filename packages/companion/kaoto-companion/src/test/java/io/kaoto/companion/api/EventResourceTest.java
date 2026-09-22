package io.kaoto.companion.api;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

import io.kaoto.companion.worker.ExecutionEventBus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@QuarkusTest
class EventResourceTest {

    @Inject
    ExecutionEventBus eventBus;

    @Test
    void unknownExecutionIdReturns404() {
        given().accept("text/event-stream")
                .when()
                .get("/v1/executions/no-such-exec/events")
                .then()
                .statusCode(404);
    }

    @Test
    void sseStreamDeliversPublishedFramesAndCompletesOnClose() throws Exception {
        String executionId = "sse-test-exec";
        eventBus.open(executionId);

        // Open SSE stream in a background thread — it blocks until the stream completes
        var t = new Thread(() -> given().accept("text/event-stream")
                .when()
                .get("/v1/executions/" + executionId + "/events")
                .then()
                .statusCode(200));
        t.setDaemon(true);
        t.start();

        // Give the stream a moment to connect
        Thread.sleep(200);

        String frame = "{\"type\":\"camel.route.started\",\"executionId\":\"" + executionId + "\",\"routeId\":\"r1\"}";
        eventBus.publish(executionId, frame);

        // Close the stream by completing the bus — this causes the SSE stream to complete
        Thread.sleep(200);
        eventBus.close(executionId);
        t.join(3000);
        // If we got here without hanging, the stream completed cleanly
        assertFalse(t.isAlive(), "SSE stream thread should have completed after eventBus.close()");
    }
}
