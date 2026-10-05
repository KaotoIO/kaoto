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
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.FileTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.jboss.logging.Logger;

/**
 * A Camel app managed through the file transport of camel-cli-connector: the files {@code {pid}-*.json} the connector
 * writes in the {@code .camel} directory. Turns them into the frames the connector's WebSocket transport sends
 * ({@code hello}, {@code snapshot}), so the rest of the Kompanion cannot tell the transports apart.
 *
 * <p>The connector rewrites status, debug, history, error and activity in place (truncate, then write: not atomic), and
 * appends to trace and receive one line per poll, holding the new messages. Not thread safe: {@link #poll()} is called
 * from one thread at a time.
 */
public class FileWorker {

    private static final Logger LOG = Logger.getLogger(FileWorker.class);

    /** Same limit as the WebSocket transport: trace and receive snapshots are split into frames of this size. */
    static final int MAX_SNAPSHOT_SIZE = 128 * 1024;

    // a torn read (the connector is rewriting the file) is retried on the next poll; only report a file that stays bad
    private static final int WARN_AFTER_FAILED_READS = 20;

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

    public FileWorker(ObjectMapper mapper, Path camelDir, long pid, FrameSink sink) {
        this.mapper = mapper;
        this.camelDir = camelDir;
        this.pid = pid;
        this.sink = sink;
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
     * Reads the status and returns the hello frame built from it, or null while the status holds no Camel context yet
     * (the connector writes it once Camel is up). Also starts tailing trace and receive from their current end: the
     * messages written before are not sent.
     */
    public ObjectNode hello() {
        JsonNode s = status.read();
        if (s != null) {
            lastStatus = s;
        }
        s = lastStatus;
        String version = s != null ? s.path("context").path("version").asText(null) : null;
        if (version == null) {
            return null;
        }
        tails.values().forEach(TailedFile::skipToEnd);
        ObjectNode hello = envelope("hello");
        hello.put("camelVersion", version);
        hello.put("name", s.path("context").path("name").asText(null));
        hello.put("transport", "file");
        hello.set("runtime", s.path("runtime").deepCopy());
        return hello;
    }

    /** Sends a snapshot frame for every file that changed since the last poll. */
    public void poll() throws Exception {
        JsonNode s = status.read();
        if (s != null) {
            lastStatus = s;
            snapshot("status", s);
        }
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
