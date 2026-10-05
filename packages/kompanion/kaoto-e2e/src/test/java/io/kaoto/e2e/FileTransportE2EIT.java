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
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.BooleanSupplier;
import java.util.function.Predicate;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

/**
 * End-to-end test of the Kompanion driving a Camel Main app it did not launch, through Apache Camel's
 * camel-cli-connector file transport (the default one, in every Camel release). The test plays the role of Kaoto: it
 * only uses the Kompanion's HTTP/SSE API. The app and the Kompanion share a camel home of their own, so neither sees
 * the developer's ~/.camel. Enabled with -Pfile-transport, on the Camel of -Dfile-it.camel.version (4.18.4, 4.22.1,
 * ...).
 */
@EnabledIfSystemProperty(named = "file.fixture.dir", matches = ".+")
class FileTransportE2EIT {

    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static KompanionProcess kompanion;
    private static FixtureApp app;
    private static SseClient sse;
    private static String executionId;

    @BeforeAll
    static void start() throws Exception {
        Path home = Files.createTempDirectory("kompanion-file-e2e");
        kompanion = KompanionProcess.start(List.of(
                "-Dkaoto.kompanion.file-transport.camel-home=" + home,
                "-Dkaoto.kompanion.file-transport.exit-timeout=3s"));
        app = FixtureApp.startCamelMain(
                Path.of(System.getProperty("file.fixture.dir")), List.of("-Duser.home=" + home));
        executionId = "pid-" + app.pid();
        // the SSE stream exists once the Kompanion found the app
        Instant deadline = Instant.now().plusSeconds(60);
        while (sse == null && Instant.now().isBefore(deadline)) {
            try {
                sse = SseClient.subscribe(kompanion.baseUrl() + "/v1/executions/" + executionId + "/events");
            } catch (IllegalStateException e) {
                assertTrue(app.isAlive(), () -> "Fixture app died:\n" + app.log());
                Thread.sleep(200);
            }
        }
        assertNotNull(
                sse, () -> "App never discovered.\nApp log:\n" + app.log() + "\nKompanion log:\n" + kompanion.log());
    }

    @AfterAll
    static void stop() throws Exception {
        if (sse != null) sse.close();
        if (app != null) app.close();
        if (kompanion != null) kompanion.close();
    }

    @Test
    void kompanionDrivesCamelMainThroughTheFileTransport() throws Exception {
        // 1. worker ready, from the status file
        JsonNode ready =
                sse.await(e -> "camel.worker.ready".equals(e.path("type").asText()), Duration.ofSeconds(10));
        assertNotNull(ready, "no camel.worker.ready event: " + sse.events());
        assertEquals("camel-cli-connector/file", ready.path("connectorProtocol").asText());
        assertEquals(
                System.getProperty("file.fixture.camel.version"),
                ready.path("camelVersion").asText());

        // 2. route control, checked by the Kompanion against the next status (the connector only logs failures)
        assertCommand("{\"type\":\"camel.cmd.route.stop\",\"routeId\":\"orders\"}", "acked");
        awaitRouteState("orders", "Stopped");
        assertCommand("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"orders\"}", "acked");
        awaitRouteState("orders", "Started");
        assertCommand("{\"type\":\"camel.cmd.route.suspend\",\"routeId\":\"orders\"}", "acked");
        assertCommand("{\"type\":\"camel.cmd.route.resume\",\"routeId\":\"orders\"}", "acked");
        awaitRouteState("orders", "Started");
        JsonNode unknown =
                assertCommand("{\"type\":\"camel.cmd.route.start\",\"routeId\":\"does-not-exist\"}", "failed");
        assertEquals("No route matching: does-not-exist", unknown.path("detail").asText());

        // 3. send, InOnly and InOut, with a header; a failing exchange is reported
        assertCommand(
                "{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:orders\","
                        + "\"headers\":{\"X-Kaoto\":\"e2e\"},\"body\":\"order-1\"}",
                "acked");
        awaitLog("orders received: order-1");
        JsonNode inOut = assertCommand(
                connectorAction("{\"action\":\"send\",\"endpoint\":\"direct:orders\",\"body\":\"order-2\","
                        + "\"exchangePattern\":\"InOut\"}"),
                "acked");
        assertEquals("success", inOut.path("detail").asText(), inOut.toString());
        JsonNode failed = assertCommand(
                connectorAction("{\"action\":\"send\",\"endpoint\":\"direct:orders\",\"body\":\"order-3\","
                        + "\"headers\":[{\"key\":\"fail\",\"value\":\"true\"}]}"),
                "failed");
        assertTrue(failed.path("detail").asText().contains("boom"), failed.toString());
        awaitStatus(
                s -> exchanges(s, "orders").path("exchangesTotal").asLong() >= 3
                        && exchanges(s, "orders").path("exchangesFailed").asLong() >= 1,
                "orders statistics after 3 messages");

        // 4. trace: turned on through a connector action, the new messages tailed from the trace file
        assertCommand(connectorAction("{\"action\":\"trace\",\"enabled\":\"true\"}"), "acked");
        for (int i = 1; i <= 5; i++) {
            assertCommand(
                    "{\"type\":\"camel.cmd.exchange.inject\",\"endpoint\":\"direct:orders\",\"body\":\"traced-" + i
                            + "\"}",
                    "acked");
        }
        List<JsonNode> traces = new ArrayList<>();
        await(
                () -> {
                    traces.clear();
                    for (JsonNode e : sse.events()) {
                        if (isSnapshot(e, "trace")) {
                            e.path("data").path("traces").forEach(traces::add);
                        }
                    }
                    return traces.stream().anyMatch(t -> t.toString().contains("traced-5"));
                },
                "the trace of the 5th message");
        long lastUid = -1;
        for (JsonNode t : traces) {
            assertTrue(t.path("uid").asLong() > lastUid, "trace out of order: " + traces);
            lastUid = t.path("uid").asLong();
        }
        for (int i = 1; i <= 5; i++) {
            String body = "traced-" + i;
            assertTrue(traces.stream().anyMatch(t -> t.toString().contains(body)), body + " not traced: " + traces);
        }
        JsonNode first = traces.get(0);
        assertEquals("orders", first.path("routeId").asText(), first.toString());
        assertFalse(first.path("nodeId").asText().isBlank(), first.toString());

        // 5. reset-stats (no output: done once the connector deleted the action file), route-dump (with an output)
        assertCommand(connectorAction("{\"action\":\"reset-stats\"}"), "acked");
        awaitStatus(s -> exchanges(s, "orders").path("exchangesTotal").asLong() == 0, "statistics reset");
        // 4.18 needs every argument of route-dump (Map.of)
        assertCommand(
                connectorAction("{\"action\":\"route-dump\",\"filter\":\"*\",\"format\":\"yaml\","
                        + "\"uriAsParameters\":\"false\"}"),
                "acked");
        var unsupported = post(connectorAction("{\"action\":\"no-such-action\"}"));
        assertEquals(422, unsupported.statusCode(), unsupported.body());

        // 6. stop: the lock file is deleted, Camel stops, the Kompanion sees the app go away
        assertCommand("{\"type\":\"camel.cmd.worker.stop\"}", "acked");
        await(
                () -> kompanion.log().contains("Worker disconnected: execution=" + executionId),
                "kompanion disconnect log");
        awaitLog("Apache Camel (Main) " + ready.path("camelVersion").asText() + " shutdown");
        if (ready.path("camelVersion").asText().startsWith("4.18.")) {
            // Camel bug, fixed in 4.19 (CAMEL-23230) and not backported: Main only calls System.exit for a non-zero
            // code, and the connector's non-daemon "Terminate JVM task" thread keeps the JVM alive. The Kompanion
            // reports it
            assertFalse(app.waitForExit(5, TimeUnit.SECONDS), "4.18 Main exits: drop this workaround");
            await(
                    () -> kompanion.log().contains("pid " + app.pid() + " still runs"),
                    "kompanion warning that the process did not exit");
        } else {
            assertTrue(app.waitForExit(30, TimeUnit.SECONDS), () -> "Fixture app did not exit:\n" + app.log());
        }

        assertFalse(kompanion.log().contains("BackPressureFailure"), kompanion.log());
        assertNull(sse.failure(), () -> "SSE failed: " + sse.failure());
    }

    // ---- helpers ----

    private static String connectorAction(String action) {
        return "{\"type\":\"camel.cmd.connector.action\",\"action\":" + action + "}";
    }

    private static JsonNode assertCommand(String command, String expectedStatus) throws Exception {
        var resp = post(command);
        assertEquals(200, resp.statusCode(), () -> command + " -> " + resp.statusCode() + " " + resp.body());
        JsonNode json = MAPPER.readTree(resp.body());
        assertEquals(
                expectedStatus,
                json.path("status").asText(),
                () -> command + " -> " + resp.body() + "\nApp log:\n" + app.log());
        return json;
    }

    private static HttpResponse<String> post(String body) throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create(kompanion.baseUrl() + "/v1/executions/" + executionId + "/commands"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private static boolean isSnapshot(JsonNode e, String kind) {
        return "camel.connector.snapshot".equals(e.path("type").asText())
                && kind.equals(e.path("kind").asText());
    }

    private static JsonNode exchanges(JsonNode status, String routeId) {
        for (JsonNode r : status.path("routes")) {
            if (routeId.equals(r.path("routeId").asText())) {
                return r.path("statistics");
            }
        }
        return MAPPER.createObjectNode();
    }

    /** Waits for a status snapshot, received from now on, that matches. */
    private static void awaitStatus(Predicate<JsonNode> predicate, String what) throws Exception {
        int from = sse.events().size();
        await(
                () -> {
                    var events = sse.events();
                    for (int i = from; i < events.size(); i++) {
                        if (isSnapshot(events.get(i), "status")
                                && predicate.test(events.get(i).path("data"))) {
                            return true;
                        }
                    }
                    return false;
                },
                what);
    }

    private static void awaitRouteState(String routeId, String state) throws Exception {
        awaitStatus(
                s -> {
                    for (JsonNode r : s.path("routes")) {
                        if (routeId.equals(r.path("routeId").asText())
                                && state.equals(r.path("state").asText())) {
                            return true;
                        }
                    }
                    return false;
                },
                routeId + "=" + state);
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
