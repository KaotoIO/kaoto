package io.kaoto.e2e;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.e2e.support.FixtureApp;
import io.kaoto.e2e.support.KompanionProcess;
import io.kaoto.e2e.support.SseClient;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

/**
 * End-to-end test of the Kompanion driving a Camel Main app through Apache Camel's camel-cli-connector WebSocket
 * transport. The test plays the role of Kaoto: it only uses the Kompanion's HTTP/SSE API. Enabled with -Pcamel-snapshot
 * (needs a Camel SNAPSHOT with the WebSocket transport installed in ~/.m2).
 */
@EnabledIfSystemProperty(named = "connector.fixture.dir", matches = ".+")
class ConnectorE2EIT {

    private static final String EXECUTION_ID = "it-1";
    private static final String TOKEN = "e2e-" + System.nanoTime();
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static KompanionProcess kompanion;
    private static FixtureApp app;
    private static SseClient sse;

    @BeforeAll
    static void start() throws Exception {
        kompanion = KompanionProcess.start(List.of("-Dkaoto.kompanion.worker-token=" + TOKEN));
        String wsUrl =
                kompanion.baseUrl().replace("http://", "ws://") + "/v1/worker/connect?executionId=" + EXECUTION_ID;
        app = FixtureApp.startCamelMain(
                Path.of(System.getProperty("connector.fixture.dir")),
                List.of(
                        "-Dcamel.cli.transport=websocket",
                        "-Dcamel.cli.websocket.url=" + wsUrl,
                        "-Dcamel.cli.websocket.token=" + TOKEN,
                        "-Dcamel.cli.websocket.snapshot-interval=500"));
        // the SSE stream exists once the worker is connected
        Instant deadline = Instant.now().plusSeconds(60);
        while (sse == null && Instant.now().isBefore(deadline)) {
            try {
                sse = SseClient.subscribe(kompanion.baseUrl() + "/v1/executions/" + EXECUTION_ID + "/events");
            } catch (IllegalStateException e) {
                assertTrue(app.isAlive(), () -> "Fixture app died:\n" + app.log());
                Thread.sleep(200);
            }
        }
        assertNotNull(
                sse, () -> "Worker never connected.\nApp log:\n" + app.log() + "\nKompanion log:\n" + kompanion.log());
    }

    @AfterAll
    static void stop() throws Exception {
        if (sse != null) sse.close();
        if (app != null) app.close();
        if (kompanion != null) kompanion.close();
    }

    @Test
    void kompanionDrivesCamelMainThroughCliConnector() throws Exception {
        // 1. worker ready (replayed to the late subscriber), from the connector's hello
        JsonNode ready =
                sse.await(e -> "camel.worker.ready".equals(e.path("type").asText()), Duration.ofSeconds(10));
        assertNotNull(ready, "no camel.worker.ready event: " + sse.events());
        assertEquals("camel-cli-connector/v1", ready.path("connectorProtocol").asText());
        assertTrue(ready.path("camelVersion").asText().startsWith("4."), ready.toString());

        // 2. route control
        assertCommand("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"route-8276\"}", "acked");
        awaitRouteState("route-8276", "Started");

        // 3. inject text with a header
        assertCommand(
                "{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:incoming\","
                        + "\"headers\":{\"X-Kaoto\":\"e2e-header\"},\"body\":\"hello-from-kaoto\"}",
                "acked");
        awaitLog("route-8276 received: hello-from-kaoto");
        assertTrue(app.log().contains("X-Kaoto=e2e-header"), app.log());

        // 4. inject a base64 (binary) body
        String b64 = Base64.getEncoder().encodeToString("binary-body-è".getBytes(StandardCharsets.UTF_8));
        assertCommand(
                "{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:incoming\",\"body\":\"" + b64
                        + "\",\"bodyEncoding\":\"base64\"}",
                "acked");
        awaitLog("route-8276 received: binary-body-");

        // 5. suspend / resume / stop
        assertCommand("{\"type\":\"camel.cmd.route.suspend\",\"routeId\":\"route-8276\"}", "acked");
        awaitRouteState("route-8276", "Suspended");
        assertCommand("{\"type\":\"camel.cmd.route.resume\",\"routeId\":\"route-8276\"}", "acked");
        awaitRouteState("route-8276", "Started");
        assertCommand("{\"type\":\"camel.cmd.route.stop\",\"routeId\":\"route-8276\"}", "acked");
        awaitRouteState("route-8276", "Stopped");

        // 6. failures are reported, not swallowed
        JsonNode unknown =
                assertCommand("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"does-not-exist\"}", "failed");
        assertTrue(unknown.path("detail").asText().contains("does-not-exist"), unknown.toString());
        // block=false: direct waits up to 30s for a stopped consumer by default, longer than the ack timeout
        JsonNode stoppedRoute = assertCommand(
                "{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:incoming?block=false\",\"body\":\"x\"}",
                "failed");
        assertFalse(stoppedRoute.path("detail").asText().isBlank(), stoppedRoute.toString());
        var blank = post("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"\"}");
        assertEquals(400, blank.statusCode(), blank.body());

        // 7. raw connector frames are passed through as well
        assertNotNull(
                sse.await(e -> "camel.connector.snapshot".equals(e.path("type").asText()), Duration.ofSeconds(5)));

        // 8. stop the worker: acked, the app exits, the kompanion sees the disconnect
        assertCommand("{\"type\":\"camel.cmd.worker.stop\"}", "acked");
        assertTrue(app.waitForExit(30, TimeUnit.SECONDS), () -> "Fixture app did not exit:\n" + app.log());
        await(
                () -> kompanion.log().contains("Worker disconnected: execution=" + EXECUTION_ID),
                "kompanion disconnect log");

        // 9. the SSE stream survived the whole run
        assertFalse(kompanion.log().contains("BackPressureFailure"), kompanion.log());
        assertNull(sse.failure(), () -> "SSE failed: " + sse.failure());
    }

    // ---- helpers ----

    private static JsonNode assertCommand(String command, String expectedStatus) throws Exception {
        var resp = post(command);
        assertEquals(200, resp.statusCode(), () -> command + " -> " + resp.statusCode() + " " + resp.body());
        JsonNode json = MAPPER.readTree(resp.body());
        assertEquals(expectedStatus, json.path("status").asText(), () -> command + " -> " + resp.body());
        return json;
    }

    private static HttpResponse<String> post(String body) throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create(kompanion.baseUrl() + "/v1/executions/" + EXECUTION_ID + "/commands"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString());
    }

    /** Waits for a telemetry snapshot (mapped from the connector's status snapshot) with the given route state. */
    private static void awaitRouteState(String routeId, String state) throws Exception {
        Instant after = Instant.now();
        int from = sse.events().size();
        JsonNode snapshot = null;
        Instant deadline = after.plusSeconds(10);
        while (snapshot == null && Instant.now().isBefore(deadline)) {
            var events = sse.events();
            for (int i = from; i < events.size(); i++) {
                JsonNode e = events.get(i);
                if ("camel.telemetry.snapshot".equals(e.path("type").asText())) {
                    for (JsonNode r : e.path("routes")) {
                        if (routeId.equals(r.path("routeId").asText())
                                && state.equals(r.path("status").asText())) {
                            snapshot = e;
                        }
                    }
                }
            }
            Thread.sleep(100);
        }
        assertNotNull(snapshot, "no telemetry snapshot with " + routeId + "=" + state);
    }

    private static void awaitLog(String text) throws Exception {
        await(() -> app.log().contains(text), "app log to contain '" + text + "'");
    }

    private static void await(BooleanSupplier condition, String what) throws Exception {
        Instant deadline = Instant.now().plusSeconds(15);
        while (!condition.getAsBoolean()) {
            if (Instant.now().isAfter(deadline)) {
                fail("Timed out waiting for " + what + "\nApp log:\n" + app.log() + "\nKompanion log:\n"
                        + kompanion.log());
            }
            Thread.sleep(100);
        }
    }
}
