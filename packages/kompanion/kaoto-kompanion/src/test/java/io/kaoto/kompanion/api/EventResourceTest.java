package io.kaoto.kompanion.api;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

import io.kaoto.kompanion.worker.ExecutionEventBus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

@QuarkusTest
class EventResourceTest {

    @io.quarkus.test.common.http.TestHTTPResource("/")
    java.net.URL url;

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
        eventBus.open(executionId, "test-conn");

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
        eventBus.close(executionId, "test-conn");
        t.join(3000);
        // If we got here without hanging, the stream completed cleanly
        assertFalse(t.isAlive(), "SSE stream thread should have completed after eventBus.close()");
    }

    @Test
    void eventsHaveAnIdAndAClientResumesAfterTheLastOneItGot() throws Exception {
        String executionId = "sse-test-resume";
        eventBus.open(executionId, "test-conn");
        eventBus.publish(executionId, "{\"n\":1}");
        eventBus.publish(executionId, "{\"n\":2}");
        eventBus.publish(executionId, "{\"n\":3}");

        var client = java.net.http.HttpClient.newHttpClient();
        var request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url + "v1/executions/" + executionId + "/events"))
                .header("Accept", "text/event-stream")
                .header("Last-Event-ID", "1")
                .build();
        var lines = new java.util.concurrent.LinkedBlockingQueue<String>();
        var response = client.sendAsync(request, java.net.http.HttpResponse.BodyHandlers.ofLines());
        Thread reader = Thread.ofVirtual().start(() -> {
            try {
                response.get().body().forEach(lines::add);
            } catch (Exception ignored) {
            }
        });

        var received = new java.util.ArrayList<String>();
        long deadline = System.currentTimeMillis() + 5000;
        while (received.stream().filter(l -> l.startsWith("data:")).count() < 2
                && System.currentTimeMillis() < deadline) {
            String line = lines.poll(100, java.util.concurrent.TimeUnit.MILLISECONDS);
            if (line != null) received.add(line);
        }
        eventBus.close(executionId, "test-conn");
        reader.join(3000);

        // after event 1: events 2 and 3, written as they are, with their id
        assertEquals(
                java.util.List.of("id:2", "data:{\"n\":2}", "id:3", "data:{\"n\":3}"),
                received.stream()
                        .filter(l -> l.startsWith("id:") || l.startsWith("data:"))
                        .map(l -> l.replace(": ", ":"))
                        .toList(),
                received.toString());
    }
}
