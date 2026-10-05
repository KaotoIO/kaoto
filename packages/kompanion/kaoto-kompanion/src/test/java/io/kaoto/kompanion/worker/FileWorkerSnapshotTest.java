package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileWorkerSnapshotTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final List<ObjectNode> frames = new ArrayList<>();

    @TempDir
    Path dir;

    private FakeConnector connector;
    private FileWorker worker;

    @BeforeEach
    void setUp() throws Exception {
        connector = new FakeConnector(dir, 4242).start("status", "trace", "receive", "debug", "history");
        worker = new FileWorker(mapper, dir, 4242, frames::add);
    }

    @Test
    void helloWaitsForTheCamelContext() throws Exception {
        // created empty at startup
        assertNull(worker.hello());
        // Camel not up yet
        connector.write("status", "{\"runtime\":{\"pid\":4242}}");
        assertNull(worker.hello());
        // the context is there before it started, without its routes
        connector.write(
                "status",
                "{\"context\":{\"name\":\"app\",\"version\":\"4.18.4\",\"state\":\"Initializing\"},"
                        + "\"routes\":[]}");
        assertNull(worker.hello());

        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        ObjectNode hello = worker.hello();
        assertNotNull(hello);
        assertEquals("hello", hello.path("type").asText());
        assertEquals(1, hello.path("v").asInt());
        assertEquals("4.18.4", hello.path("camelVersion").asText());
        assertEquals("app", hello.path("name").asText());
        assertEquals("file", hello.path("transport").asText());
        assertEquals("Camel", hello.path("runtime").path("platform").asText());
    }

    @Test
    void tornStatusIsSkippedUntilItParses() throws Exception {
        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        assertNotNull(worker.hello());

        String stopped = FakeConnector.status("4.18.4", "Stopped");
        connector.writeTorn("status", stopped);
        worker.poll();
        assertTrue(frames.isEmpty(), frames::toString);
        connector.write("status", "");
        worker.poll();
        assertTrue(frames.isEmpty(), frames::toString);

        connector.write("status", stopped);
        worker.poll();
        assertEquals(1, frames.size());
        ObjectNode frame = frames.get(0);
        assertEquals("snapshot", frame.path("type").asText());
        assertEquals("status", frame.path("kind").asText());
        assertEquals(
                "Stopped",
                frame.path("data").path("routes").path(0).path("state").asText());
        assertEquals(
                "Stopped",
                worker.lastStatus().path("routes").path(0).path("state").asText());

        // not rewritten since: nothing new
        worker.poll();
        assertEquals(1, frames.size());
    }

    @Test
    void stateSnapshotsAreOnlySentWhenTheyChange() throws Exception {
        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        worker.hello();

        connector.write("debug", "{\"suspended\":false}\n");
        worker.poll();
        // the connector rewrites the same content every other poll
        connector.write("debug", "{\"suspended\":false}\n");
        worker.poll();
        connector.write("debug", "{\"suspended\":true}\n");
        worker.poll();
        // empty, as the WebSocket transport
        connector.write("history", "{}\n");
        worker.poll();

        List<JsonNode> debug = ofKind("debug");
        assertEquals(2, debug.size(), frames::toString);
        assertFalse(debug.get(0).path("data").path("suspended").asBoolean());
        assertTrue(debug.get(1).path("data").path("suspended").asBoolean());
        assertTrue(ofKind("history").isEmpty());
        // error and activity do not exist before 4.21: not an error
        assertFalse(Files.exists(connector.file("error")));
    }

    @Test
    void traceIsTailedFromTheEndAndOnlyByCompleteLines() throws Exception {
        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        connector.append("trace", traces(1) + "\n");
        worker.hello();

        // written before the worker attached
        worker.poll();
        assertTrue(ofKind("trace").isEmpty());

        String line = traces(2, 3);
        connector.append("trace", line.substring(0, 10));
        worker.poll();
        assertTrue(ofKind("trace").isEmpty());
        // the connector uses the platform line separator
        connector.append("trace", line.substring(10) + "\r\n");
        worker.poll();

        List<JsonNode> trace = ofKind("trace");
        assertEquals(1, trace.size());
        assertEquals(2, trace.get(0).path("data").path("traces").size());
        assertEquals(
                2, trace.get(0).path("data").path("traces").path(0).path("uid").asInt());
        assertEquals(
                "r1",
                trace.get(0).path("data").path("traces").path(0).path("routeId").asText());
    }

    @Test
    void traceStartsOverWhenTheFileIsTruncatedOrReplaced() throws Exception {
        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        connector.append("trace", traces(1) + "\n" + traces(2) + "\n");
        worker.hello();

        connector.write("trace", traces(3) + "\n");
        worker.poll();
        Files.delete(connector.file("trace"));
        worker.poll();
        connector.append("trace", traces(4) + "\n");
        worker.poll();

        List<JsonNode> trace = ofKind("trace");
        assertEquals(2, trace.size(), frames::toString);
        assertEquals(
                3, trace.get(0).path("data").path("traces").path(0).path("uid").asInt());
        assertEquals(
                4, trace.get(1).path("data").path("traces").path(0).path("uid").asInt());
    }

    @Test
    void largeTraceLinesAreSplitAsTheWebSocketTransportDoes() throws Exception {
        connector.write("status", FakeConnector.status("4.18.4", "Started"));
        worker.hello();

        String body = "x".repeat(60 * 1024);
        String huge = "y".repeat(FileWorker.MAX_SNAPSHOT_SIZE + 1);
        connector.append(
                "receive",
                "{\"enabled\":true,\"messages\":[" + message(1, body) + "," + message(2, body) + "," + message(3, body)
                        + "," + message(4, huge) + "]}\n");
        worker.poll();

        List<JsonNode> receive = ofKind("receive");
        assertEquals(2, receive.size(), () -> "frames: " + receive.size());
        assertEquals(2, receive.get(0).path("data").path("messages").size());
        JsonNode second = receive.get(1).path("data").path("messages");
        assertEquals(2, second.size());
        assertEquals(3, second.path(0).path("uid").asInt());
        assertTrue(second.path(1).path("truncated").asBoolean());
        assertEquals(4, second.path(1).path("uid").asInt());
        // the other fields of the line are kept in every frame
        assertTrue(receive.get(1).path("data").path("enabled").asBoolean());
        for (JsonNode frame : receive) {
            assertTrue(mapper.writeValueAsBytes(frame.path("data")).length < FileWorker.MAX_SNAPSHOT_SIZE + 1024);
        }
    }

    private List<JsonNode> ofKind(String kind) {
        return frames.stream()
                .filter(f -> kind.equals(f.path("kind").asText()))
                .map(JsonNode.class::cast)
                .toList();
    }

    private static String traces(int... uids) {
        var sb = new StringBuilder("{\"enabled\":true,\"traces\":[");
        for (int i = 0; i < uids.length; i++) {
            if (i > 0) sb.append(',');
            sb.append("{\"uid\":")
                    .append(uids[i])
                    .append(",\"routeId\":\"r1\",\"nodeId\":\"log1\",\"message\":{\"body\":{\"value\":\"b\"}}}");
        }
        return sb.append("]}").toString();
    }

    private static String message(int uid, String body) {
        return "{\"uid\":" + uid + ",\"message\":{\"body\":{\"value\":\"" + body + "\"}}}";
    }
}
