package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileWorkerActionTest {

    private static final FileWorker.Timeouts TIMEOUTS =
            new FileWorker.Timeouts(Duration.ofSeconds(30), Duration.ofSeconds(2), Duration.ofSeconds(3));

    private final ObjectMapper mapper = new ObjectMapper();
    private final List<ObjectNode> frames = new ArrayList<>();
    private final FakeConnector.ManualClock clock = new FakeConnector.ManualClock();

    @TempDir
    Path dir;

    private FakeConnector connector;
    private FileWorker worker;

    private void start(String camelVersion, String routeState) throws Exception {
        connector = new FakeConnector(dir, 4242).start("status", "trace", "receive", "debug", "history");
        connector.write("status", FakeConnector.status(camelVersion, routeState));
        worker = new FileWorker(mapper, dir, 4242, frames::add, TIMEOUTS, clock);
        assertNotNull(worker.hello());
    }

    @Test
    void multiSlotRunsActionsSideBySideAndCleansTheOutputs() throws Exception {
        start("4.22.1", "Started");
        worker.submit(action("a1", "{\"action\":\"send\",\"endpoint\":\"direct:in\",\"body\":\"hi\"}"));
        worker.submit(action("a2", "{\"action\":\"route-dump\",\"filter\":\"*\",\"format\":\"yaml\"}"));
        worker.poll();

        assertTrue(Files.exists(dir.resolve("4242-action-a1.json")));
        assertTrue(Files.exists(dir.resolve("4242-action-a2.json")));
        assertNoTempFiles();
        assertTrue(results().isEmpty());

        int ran = connector.runActions(true, json -> {
            JsonNode a = mapper.readTree(json);
            return "send".equals(a.path("action").asText())
                    ? "{\"status\":\"success\",\"body\":\"reply to "
                            + a.path("body").asText() + "\"}"
                    : "{\"routes\":[{\"routeId\":\"r1\",\"code\":\"- route: ...\"}]}";
        });
        assertEquals(2, ran);
        worker.poll();

        assertEquals("reply to hi", result("a1").path("result").path("body").asText());
        assertTrue(result("a1").path("ok").asBoolean());
        assertEquals(
                "r1",
                result("a2")
                        .path("result")
                        .path("routes")
                        .path(0)
                        .path("routeId")
                        .asText());
        assertFalse(Files.exists(dir.resolve("4242-output-a1.json")));
        assertFalse(Files.exists(dir.resolve("4242-output-a2.json")));
    }

    @Test
    void singleSlotRunsOneActionAtATimeAndIgnoresAnOldOutput() throws Exception {
        start("4.18.4", "Started");
        connector.write("output", "{\"status\":\"success\",\"body\":\"stale\"}");
        worker.submit(action("a1", "{\"action\":\"send\",\"endpoint\":\"direct:in\",\"body\":\"one\"}"));
        worker.submit(action("a2", "{\"action\":\"send\",\"endpoint\":\"direct:in\",\"body\":\"two\"}"));
        worker.poll();

        assertTrue(Files.exists(connector.file("action")));
        assertFalse(Files.exists(connector.file("output")), "the old output must be cleared");
        assertFalse(Files.exists(dir.resolve("4242-action-a2.json")), "4.18 has no per-request action files");

        var bodies = new ArrayList<String>();
        FakeConnector.ActionHandler echo = json -> {
            String body = mapper.readTree(json).path("body").asText();
            bodies.add(body);
            return "{\"status\":\"success\",\"body\":\"" + body + "\"}";
        };
        assertEquals(1, connector.runActions(false, echo));
        worker.poll();
        assertEquals("one", result("a1").path("result").path("body").asText());
        // the next one goes in once the slot is free
        assertEquals(1, connector.runActions(false, echo));
        worker.poll();
        assertEquals("two", result("a2").path("result").path("body").asText());
        assertEquals(List.of("one", "two"), bodies);
    }

    @Test
    void singleSlotTakenByAnotherClientIsReportedBusy() throws Exception {
        start("4.18.4", "Started");
        connector.write("action", "{\"action\":\"thread-dump\"}");
        worker.submit(action("a1", "{\"action\":\"reset-stats\"}"));
        worker.poll();
        clock.advance(Duration.ofSeconds(1));
        worker.poll();
        assertTrue(results().isEmpty());

        clock.advance(Duration.ofSeconds(2));
        worker.poll();
        assertFalse(result("a1").path("ok").asBoolean());
        assertTrue(
                result("a1").path("error").asText().startsWith("Busy"),
                result("a1").toString());
        // the other client's action is left alone
        assertTrue(Files.readString(connector.file("action")).contains("thread-dump"));
    }

    @Test
    void singleSlotActionWithoutOutputFailed() throws Exception {
        start("4.18.4", "Started");
        // route-dump with a missing argument fails on 4.18 (Map.of with a null value): only logged by the app
        worker.submit(action("a1", "{\"action\":\"route-dump\"}"));
        worker.poll();
        connector.runActions(false, json -> null);
        worker.poll();

        assertFalse(result("a1").path("ok").asBoolean());
        assertTrue(
                result("a1").path("error").asText().contains("wrote no output"),
                result("a1").toString());
    }

    @Test
    void actionsWithoutOutputAreDoneOnceTheFileIsGone() throws Exception {
        start("4.22.1", "Started");
        worker.submit(action("a1", "{\"action\":\"reset-stats\"}"));
        worker.poll();
        connector.runActions(true, json -> null);
        worker.poll();

        assertTrue(result("a1").path("ok").asBoolean(), result("a1").toString());
    }

    @Test
    void unknownRouteFailsWithoutWritingAnActionFile() throws Exception {
        start("4.22.1", "Started");
        worker.submit(action("a1", "{\"action\":\"route\",\"command\":\"start\",\"id\":\"nope\"}"));
        worker.poll();

        assertEquals("No route matching: nope", result("a1").path("error").asText());
        assertEquals(0, connector.runActions(true, json -> null));
    }

    @Test
    void routeActionIsCheckedAgainstTheNextStatus() throws Exception {
        start("4.22.1", "Stopped");
        worker.submit(action("a1", "{\"action\":\"route\",\"command\":\"start\",\"id\":\"r1\"}"));
        worker.poll();
        connector.runActions(true, json -> null);
        // the status written before the action ran is still the latest one
        worker.poll();
        assertTrue(results().isEmpty());

        connector.write("status", FakeConnector.status("4.22.1", "Started"));
        worker.poll();
        assertTrue(result("a1").path("ok").asBoolean(), result("a1").toString());
        assertEquals("Started", result("a1").path("result").path("state").asText());
    }

    @Test
    void routeActionThatDoesNotChangeTheStateFails() throws Exception {
        start("4.22.1", "Stopped");
        worker.submit(action("a1", "{\"action\":\"route\",\"command\":\"start\",\"id\":\"r1\"}"));
        worker.poll();
        connector.runActions(true, json -> null);
        worker.poll();
        clock.advance(Duration.ofSeconds(4));
        worker.poll();

        assertFalse(result("a1").path("ok").asBoolean());
        assertEquals(
                "Route r1 is Stopped instead of Started (see the app log)",
                result("a1").path("error").asText());
    }

    @Test
    void actionNeverPickedUpTimesOutAndIsTakenBack() throws Exception {
        start("4.22.1", "Started");
        worker.submit(action("a1", "{\"action\":\"send\",\"endpoint\":\"direct:in\"}"));
        worker.poll();
        clock.advance(Duration.ofSeconds(31));
        worker.poll();

        assertFalse(result("a1").path("ok").asBoolean());
        assertTrue(
                result("a1").path("error").asText().startsWith("Timed out after 30s"),
                result("a1").toString());
        assertFalse(Files.exists(dir.resolve("4242-action-a1.json")));

        // the connector was in the middle of it: its late output is cleaned up
        Files.writeString(dir.resolve("4242-output-a1.json"), "{}");
        worker.poll();
        assertFalse(Files.exists(dir.resolve("4242-output-a1.json")));
    }

    @Test
    void stopDeletesTheLockFile() throws Exception {
        start("4.18.4", "Started");
        worker.submit(action("a1", "{\"action\":\"stop\"}"));
        worker.poll();

        assertTrue(result("a1").path("ok").asBoolean());
        assertFalse(Files.exists(connector.lockFile()));
    }

    @Test
    void closeTakesBackThePendingActionFiles() throws Exception {
        start("4.22.1", "Started");
        worker.submit(action("a1", "{\"action\":\"send\",\"endpoint\":\"direct:in\"}"));
        worker.poll();
        worker.close();

        assertFalse(Files.exists(dir.resolve("4242-action-a1.json")));
    }

    @Test
    void actionsAreOnlyWrittenByThePollingThread() throws Exception {
        start("4.22.1", "Started");
        var threads = new ArrayList<Thread>();
        for (int i = 0; i < 8; i++) {
            int n = i;
            threads.add(Thread.ofVirtual().start(() -> {
                worker.submit(action("c" + n, "{\"action\":\"reset-stats\"}"));
            }));
        }
        for (Thread t : threads) {
            t.join();
        }
        worker.poll();
        assertEquals(8, connector.runActions(true, json -> null));
        worker.poll();
        assertEquals(8, results().size());
    }

    private void assertNoTempFiles() throws Exception {
        try (var files = Files.list(dir)) {
            files.forEach(f -> {
                String name = f.getFileName().toString();
                assertFalse(name.startsWith(".kompanion-"), name);
                if (name.startsWith("4242-action")) {
                    // complete JSON: written under another name, then renamed
                    assertDoesNotThrow(() -> mapper.readTree(Files.readString(f)), name);
                }
            });
        }
    }

    private List<ObjectNode> results() {
        return frames.stream()
                .filter(f -> "result".equals(f.path("type").asText()))
                .toList();
    }

    private ObjectNode result(String requestId) {
        return results().stream()
                .filter(f -> requestId.equals(f.path("requestId").asText()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no result for " + requestId + " in " + frames));
    }

    private static String action(String requestId, String action) {
        return "{\"v\":1,\"type\":\"action\",\"requestId\":\"" + requestId + "\",\"action\":" + action + "}";
    }
}
