package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import org.jboss.logging.Logger;

/**
 * A Camel app managed through the file transport of camel-cli-connector: the files {@code {pid}-*.json} the connector
 * writes in the {@code .camel} directory. Turns them into the frames the connector's WebSocket transport sends
 * ({@code hello}, {@code snapshot}), so the rest of the Kompanion cannot tell the transports apart.
 *
 * <p>The connector rewrites status, debug, history, error and activity in place (truncate, then write: not atomic), and
 * appends to trace and receive one line per poll, holding the new messages.
 *
 * <p>Actions are written as files the connector picks up on its next poll (every second): it runs the action, writes
 * the output (when the action has one) and deletes the action file, also when the action fails. So a deleted action
 * file means done; failures are only logged by the app, and the action result is all there is to tell (see
 * {@link ConnectorActions#writesOutput}). Before 4.21 there is a single action file per app, which the {@code camel}
 * CLI uses too.
 *
 * <p>{@link #submit} may be called from any thread; {@link #poll()} from one thread at a time, which does all the file
 * work.
 */
public class FileWorker {

    private static final Logger LOG = Logger.getLogger(FileWorker.class);

    /** Same limit as the WebSocket transport: trace and receive snapshots are split into frames of this size. */
    static final int MAX_SNAPSHOT_SIZE = 128 * 1024;

    // a torn read (the connector is rewriting the file) is retried on the next poll; only report a file that stays bad
    private static final int WARN_AFTER_FAILED_READS = 20;

    /** How long the worker waits for the connector. */
    public record Timeouts(Duration action, Duration busy, Duration routeVerify) {
        public static final Timeouts DEFAULT =
                new Timeouts(Duration.ofSeconds(60), Duration.ofSeconds(5), Duration.ofSeconds(5));
    }

    /** Receives the frames of the worker. */
    @FunctionalInterface
    public interface FrameSink {
        void accept(ObjectNode frame) throws Exception;
    }

    private final ObjectMapper mapper;
    private final long pid;
    private final Path camelDir;
    private final FrameSink sink;

    private final RewrittenFile status;
    // kind -> file, in the order the WebSocket transport sends them
    private final Map<String, RewrittenFile> states = new LinkedHashMap<>();
    private final Map<String, TailedFile> tails = new LinkedHashMap<>();

    private volatile JsonNode lastStatus;

    private final Timeouts timeouts;
    private final Clock clock;
    private final Queue<PendingAction> submitted = new ConcurrentLinkedQueue<>();
    // only used by the polling thread
    private final List<PendingAction> pending = new ArrayList<>();
    // output files of actions that timed out, deleted if the connector still writes them: path -> until
    private final Map<Path, Instant> lateOutputs = new HashMap<>();
    private ConnectorActions actions;

    public FileWorker(ObjectMapper mapper, Path camelDir, long pid, FrameSink sink) {
        this(mapper, camelDir, pid, sink, Timeouts.DEFAULT, Clock.systemUTC());
    }

    public FileWorker(ObjectMapper mapper, Path camelDir, long pid, FrameSink sink, Timeouts timeouts, Clock clock) {
        this.mapper = mapper;
        this.camelDir = camelDir;
        this.pid = pid;
        this.sink = sink;
        this.timeouts = timeouts;
        this.clock = clock;
        this.status = new RewrittenFile(file("status"));
        for (String kind : List.of("debug", "history", "error", "activity")) {
            states.put(kind, new RewrittenFile(file(kind)));
        }
        tails.put("trace", new TailedFile(file("trace"), "traces"));
        tails.put("receive", new TailedFile(file("receive"), "messages"));
    }

    public long pid() {
        return pid;
    }

    /** The {@code {pid}-<suffix>.json} file of this app. */
    Path file(String suffix) {
        return camelDir.resolve(pid + "-" + suffix + ".json");
    }

    /** The lock file: the app stops when it is deleted. */
    Path lockFile() {
        return camelDir.resolve(Long.toString(pid));
    }

    /** The last status read, or null when none could be read yet. */
    public JsonNode lastStatus() {
        return lastStatus;
    }

    /**
     * Reads the status and returns the hello frame built from it, or null until the Camel context started. Also starts
     * tailing trace and receive from their current end: the messages written before are not sent.
     */
    public ObjectNode hello() {
        JsonNode s = status.read();
        if (s != null) {
            lastStatus = s;
        }
        s = lastStatus;
        String version = s != null ? s.path("context").path("version").asText(null) : null;
        // the context is in the status from the start, with no routes until it started: the WebSocket transport says
        // hello once Camel started, so does this one
        String state = s != null ? s.path("context").path("state").asText() : "";
        if (version == null || !(state.equals("Started") || state.equals("Suspended"))) {
            return null;
        }
        tails.values().forEach(TailedFile::skipToEnd);
        actions = ConnectorActions.of(version);
        ObjectNode hello = envelope("hello");
        hello.put("camelVersion", version);
        hello.put("name", s.path("context").path("name").asText(null));
        hello.put("transport", "file");
        hello.set("runtime", s.path("runtime").deepCopy());
        return hello;
    }

    /**
     * Takes a connector action frame ({@code {"v":1,"type":"action","requestId":...,"action":{...}}}): it is written as
     * an action file on the next {@link #poll()}, which sends the result frame once the connector ran it.
     */
    public void submit(String frame) {
        try {
            JsonNode node = mapper.readTree(frame);
            String requestId = node.path("requestId").asText(null);
            JsonNode action = node.path("action");
            if (requestId == null || !action.isObject()) {
                LOG.warnf("Ignoring a malformed action frame for pid %d", pid);
                return;
            }
            submitted.add(new PendingAction(requestId, (ObjectNode) action));
        } catch (IOException e) {
            LOG.warnf("Ignoring an action frame for pid %d that does not parse: %s", pid, e.getMessage());
        }
    }

    /**
     * Sends a snapshot frame for every file that changed since the last poll, runs the submitted actions and sends the
     * result frame of every action the connector ran.
     */
    public void poll() throws Exception {
        JsonNode s = status.read();
        if (s != null) {
            lastStatus = s;
            snapshot("status", s);
        }
        pollActions();
        for (Map.Entry<String, TailedFile> e : tails.entrySet()) {
            for (JsonNode line : e.getValue().readNewLines()) {
                sendInBatches(e.getKey(), line, e.getValue().messagesKey);
            }
        }
        for (Map.Entry<String, RewrittenFile> e : states.entrySet()) {
            RewrittenFile f = e.getValue();
            JsonNode data = f.read();
            // the WebSocket transport only sends these when they changed
            if (data != null && !Objects.equals(data, f.lastSent)) {
                f.lastSent = data;
                snapshot(e.getKey(), data);
            }
        }
    }

    /** Deletes the action files of this worker still waiting for the connector (the worker is going away). */
    public void close() {
        for (PendingAction a : pending) {
            if (a.state == State.WRITTEN && a.actionFile != null) {
                deleteQuietly(a.actionFile);
            }
        }
        pending.clear();
    }

    private void pollActions() throws Exception {
        for (PendingAction a; (a = submitted.poll()) != null; ) {
            pending.add(a);
        }
        Instant now = clock.instant();
        lateOutputs.entrySet().removeIf(e -> deleteQuietly(e.getKey()) || now.isAfter(e.getValue()));
        var it = pending.iterator();
        while (it.hasNext()) {
            PendingAction a = it.next();
            ObjectNode result =
                    switch (a.state) {
                        case QUEUED -> start(a, now);
                        case WRITTEN -> written(a, now);
                        case VERIFYING -> verify(a, now);
                    };
            if (result != null) {
                it.remove();
                sink.accept(result);
            }
        }
    }

    /** Writes the action file, or answers right away. Returns the result frame, or null while the action runs. */
    private ObjectNode start(PendingAction a, Instant now) throws IOException {
        String name = a.action.path("action").asText();
        if ("stop".equals(name)) {
            // the connector stops the app when its lock file is deleted (there is no stop action)
            Files.deleteIfExists(lockFile());
            return ok(a, mapper.createObjectNode());
        }
        String unknownRoute = unknownRoute(a);
        if (unknownRoute != null) {
            return failed(a, "No route matching: " + unknownRoute);
        }
        boolean multiSlot = actions != null && actions.multiSlot();
        if (multiSlot) {
            a.actionFile = camelDir.resolve(pid + "-action-" + a.requestId + ".json");
            a.outputFile = camelDir.resolve(pid + "-output-" + a.requestId + ".json");
        } else {
            // one action at a time, through the single slot the camel CLI uses too
            if (pending.stream().anyMatch(p -> p != a && p.state != State.QUEUED)) {
                return null;
            }
            a.actionFile = file("action");
            a.outputFile = file("output");
            if (Files.exists(a.actionFile)) {
                // an action of another client (camel CLI), or the empty file of the connector startup: it is gone on
                // the
                // connector's next poll
                if (a.busySince == null) {
                    a.busySince = now;
                } else if (now.isAfter(a.busySince.plus(timeouts.busy()))) {
                    return failed(
                            a, "Busy: " + a.actionFile.getFileName() + " is taken by another client (camel CLI?)");
                }
                return null;
            }
            // the connector does not clear it: the output of a previous action must not be taken for this one's
            Files.deleteIfExists(a.outputFile);
        }
        // the connector deletes an action file it cannot parse: write it under a name it does not pick up, then rename
        Path tmp = camelDir.resolve(".kompanion-" + UUID.randomUUID() + ".tmp");
        try {
            Files.write(tmp, mapper.writeValueAsBytes(a.action));
            Files.move(tmp, a.actionFile, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            Files.deleteIfExists(tmp);
        }
        a.state = State.WRITTEN;
        a.writtenAt = now;
        return null;
    }

    /** Waits for the connector to delete the action file, then answers with its output. */
    private ObjectNode written(PendingAction a, Instant now) throws IOException {
        if (Files.exists(a.actionFile)) {
            if (now.isAfter(a.writtenAt.plus(timeouts.action()))) {
                // the connector picks the file again if it is still there: take it back
                boolean taken = deleteQuietly(a.actionFile);
                if (a.outputFile != null && !a.outputFile.equals(file("output"))) {
                    lateOutputs.put(a.outputFile, now.plus(Duration.ofMinutes(10)));
                }
                return failed(
                        a,
                        (taken ? "Timed out" : "Timed out, the action may still run")
                                + " after " + timeouts.action().toSeconds()
                                + "s waiting for the camel-cli-connector of pid "
                                + pid + " to run the action");
            }
            return null;
        }
        String name = a.action.path("action").asText();
        if (!ConnectorActions.writesOutput(name)) {
            if (expectedRouteStates(a) != null) {
                a.state = State.VERIFYING;
                a.verifyUntil = now.plus(timeouts.routeVerify());
                return verify(a, now);
            }
            return ok(a, mapper.createObjectNode());
        }
        // the connector writes the output before deleting the action file
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(a.outputFile);
        } catch (NoSuchFileException e) {
            bytes = new byte[0];
        }
        if (a.outputFile.getFileName().toString().startsWith(pid + "-output-")) {
            // the connector never deletes the outputs of the per-request actions
            deleteQuietly(a.outputFile);
        }
        if (bytes.length == 0) {
            return failed(
                    a,
                    "The action wrote no output: it failed (see the app log)"
                            + (actions != null && actions.multiSlot() ? "" : " or another client (camel CLI) took it"));
        }
        try {
            return ok(a, mapper.readTree(bytes));
        } catch (IOException e) {
            return failed(a, "The action output is not JSON: " + e.getMessage());
        }
    }

    /**
     * Route actions write no output and their failures are only logged: the result is the route state in the status the
     * connector writes after running them.
     */
    private ObjectNode verify(PendingAction a, Instant now) {
        String routeId = a.action.path("id").asText();
        String state = routeState(lastStatus, routeId);
        List<String> expected = expectedRouteStates(a);
        if (state != null && expected.contains(state)) {
            ObjectNode result = mapper.createObjectNode();
            result.put("routeId", routeId);
            result.put("state", state);
            return ok(a, result);
        }
        if (now.isAfter(a.verifyUntil)) {
            return failed(
                    a,
                    "Route " + routeId + " is " + state + " instead of " + String.join(" or ", expected)
                            + " (see the app log)");
        }
        return null;
    }

    /** The route id of a route action that is not in the last status, or null. */
    private String unknownRoute(PendingAction a) {
        if (!"route".equals(a.action.path("action").asText()) || lastStatus == null) {
            return null;
        }
        String id = a.action.path("id").asText(null);
        if (!isSingleRouteId(id) || !lastStatus.path("routes").isArray()) {
            return null;
        }
        return routeState(lastStatus, id) == null ? id : null;
    }

    /** The route states a route action is expected to end in, or null when it is not checked. */
    private static List<String> expectedRouteStates(PendingAction a) {
        if (!"route".equals(a.action.path("action").asText())
                || !isSingleRouteId(a.action.path("id").asText(null))) {
            return null;
        }
        return switch (a.action.path("command").asText()) {
            case "start", "resume" -> List.of("Started");
            case "stop" -> List.of("Stopped");
            // a route whose consumer cannot be suspended is stopped instead
            case "suspend" -> List.of("Suspended", "Stopped");
            default -> null;
        };
    }

    private static boolean isSingleRouteId(String id) {
        return id != null && !id.isBlank() && !id.contains("*") && !id.contains(",");
    }

    private static String routeState(JsonNode status, String routeId) {
        if (status == null) {
            return null;
        }
        for (JsonNode r : status.path("routes")) {
            if (routeId.equals(r.path("routeId").asText())) {
                return r.path("state").asText(null);
            }
        }
        return null;
    }

    private ObjectNode ok(PendingAction a, JsonNode result) {
        ObjectNode frame = envelope("result");
        frame.put("requestId", a.requestId);
        frame.put("ok", true);
        frame.set("result", result);
        return frame;
    }

    private ObjectNode failed(PendingAction a, String error) {
        ObjectNode frame = envelope("result");
        frame.put("requestId", a.requestId);
        frame.put("ok", false);
        frame.put("error", error);
        frame.set("result", mapper.createObjectNode());
        return frame;
    }

    private static boolean deleteQuietly(Path path) {
        try {
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            return false;
        }
    }

    private enum State {
        QUEUED,
        WRITTEN,
        VERIFYING
    }

    private static final class PendingAction {
        final String requestId;
        final ObjectNode action;
        State state = State.QUEUED;
        Instant busySince;
        Instant writtenAt;
        Instant verifyUntil;
        Path actionFile;
        Path outputFile;

        PendingAction(String requestId, ObjectNode action) {
            this.requestId = requestId;
            this.action = action;
        }
    }

    private void snapshot(String kind, JsonNode data) throws Exception {
        if (data.isEmpty()) {
            // as the WebSocket transport
            return;
        }
        ObjectNode frame = envelope("snapshot");
        frame.put("kind", kind);
        frame.set("data", data);
        sink.accept(frame);
    }

    /**
     * Sends the messages of one trace or receive line in as many snapshots as needed to keep each under
     * {@link #MAX_SNAPSHOT_SIZE}, as the WebSocket transport does (a single larger message is replaced by a marker).
     */
    private void sendInBatches(String kind, JsonNode data, String key) throws Exception {
        if (!data.isObject() || !data.path(key).isArray() || data.path(key).isEmpty()) {
            return;
        }
        List<JsonNode> batch = new ArrayList<>();
        int size = 0;
        for (JsonNode m : data.path(key)) {
            int length = mapper.writeValueAsBytes(m).length;
            if (length > MAX_SNAPSHOT_SIZE) {
                ObjectNode marker = mapper.createObjectNode();
                marker.set("uid", m.path("uid"));
                marker.put("truncated", true);
                marker.put("size", length);
                m = marker;
                length = 64;
            }
            if (!batch.isEmpty() && size + length > MAX_SNAPSHOT_SIZE) {
                snapshot(kind, withMessages((ObjectNode) data, key, batch));
                batch = new ArrayList<>();
                size = 0;
            }
            batch.add(m);
            size += length;
        }
        if (!batch.isEmpty()) {
            snapshot(kind, withMessages((ObjectNode) data, key, batch));
        }
    }

    private ObjectNode withMessages(ObjectNode data, String key, List<JsonNode> messages) {
        ObjectNode copy = data.deepCopy();
        ArrayNode array = copy.putArray(key);
        messages.forEach(array::add);
        return copy;
    }

    private ObjectNode envelope(String type) {
        ObjectNode frame = mapper.createObjectNode();
        frame.put("v", ConnectorProtocolCodec.VERSION);
        frame.put("type", type);
        return frame;
    }

    /** A file the connector rewrites in place: read again when it changed, and skipped while it does not parse. */
    private final class RewrittenFile {
        private final Path path;
        private FileTime lastModified;
        private long lastSize = -1;
        private int failedReads;
        // what was last sent, for the files only sent when they change
        private JsonNode lastSent;

        RewrittenFile(Path path) {
            this.path = path;
        }

        /** Returns the content when it changed since the last good read, or null. */
        JsonNode read() {
            try {
                BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
                if (attrs.size() == lastSize && attrs.lastModifiedTime().equals(lastModified)) {
                    return null;
                }
                byte[] bytes = Files.readAllBytes(path);
                if (bytes.length == 0) {
                    // not written yet, or caught between the truncate and the write
                    return null;
                }
                JsonNode node = mapper.readTree(bytes);
                // remember what was read only once it parsed, so a torn read is read again
                lastModified = attrs.lastModifiedTime();
                lastSize = attrs.size();
                failedReads = 0;
                return node;
            } catch (NoSuchFileException e) {
                // not there yet (or not on this Camel version), or the app is stopping
                return null;
            } catch (IOException e) {
                // a read caught in the middle of a rewrite is a strict prefix of the JSON, which never parses
                if (++failedReads == WARN_AFTER_FAILED_READS) {
                    LOG.warnf("Cannot read %s after %d attempts: %s", path, failedReads, e.getMessage());
                }
                return null;
            }
        }
    }

    /** A file the connector appends lines to: read from an offset, only up to the last complete line. */
    private final class TailedFile {
        private final Path path;
        private final String messagesKey;
        private long offset;
        private Object fileKey;

        TailedFile(Path path, String messagesKey) {
            this.path = path;
            this.messagesKey = messagesKey;
        }

        void skipToEnd() {
            try {
                BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class);
                offset = attrs.size();
                fileKey = attrs.fileKey();
            } catch (IOException e) {
                // created later: read from its start
                offset = 0;
                fileKey = null;
            }
        }

        List<JsonNode> readNewLines() {
            BasicFileAttributes attrs;
            try {
                attrs = Files.readAttributes(path, BasicFileAttributes.class);
            } catch (IOException e) {
                offset = 0;
                fileKey = null;
                return List.of();
            }
            if ((fileKey != null && !fileKey.equals(attrs.fileKey())) || attrs.size() < offset) {
                // replaced or truncated: start over
                offset = 0;
            }
            fileKey = attrs.fileKey();
            long available = attrs.size() - offset;
            if (available <= 0) {
                return List.of();
            }
            byte[] bytes;
            try (FileChannel channel = FileChannel.open(path, StandardOpenOption.READ)) {
                ByteBuffer buffer = ByteBuffer.allocate((int) Math.min(available, Integer.MAX_VALUE - 8));
                channel.position(offset);
                while (buffer.hasRemaining() && channel.read(buffer) > 0) {
                    // read what is there
                }
                bytes = Arrays.copyOf(buffer.array(), buffer.position());
            } catch (IOException e) {
                return List.of();
            }
            int end = lastNewline(bytes);
            if (end < 0) {
                // the connector is still writing the line
                return List.of();
            }
            offset += end + 1;
            List<JsonNode> lines = new ArrayList<>();
            for (String line : new String(bytes, 0, end, StandardCharsets.UTF_8).split("\n")) {
                if (line.isBlank()) {
                    continue;
                }
                try {
                    lines.add(mapper.readTree(line.strip()));
                } catch (IOException e) {
                    LOG.debugf("Skipping a line of %s that does not parse: %s", path, e.getMessage());
                }
            }
            return lines;
        }

        private static int lastNewline(byte[] bytes) {
            for (int i = bytes.length - 1; i >= 0; i--) {
                if (bytes[i] == '\n') {
                    return i;
                }
            }
            return -1;
        }
    }
}
