package io.kaoto.kompanion.worker;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Writes the files of a camel-cli-connector file transport the way the connector does (IOHelper writeText/appendText).
 */
class FakeConnector {

    final Path dir;
    final long pid;
    // each write gets a distinct modification time, also on file systems with a coarse clock
    private long clock = Instant.now().getEpochSecond();

    FakeConnector(Path dir, long pid) throws IOException {
        this.dir = dir;
        this.pid = pid;
        Files.createDirectories(dir);
    }

    Path file(String suffix) {
        return dir.resolve(pid + "-" + suffix + ".json");
    }

    Path lockFile() {
        return dir.resolve(Long.toString(pid));
    }

    /** Creates the lock file and the empty files, as the connector does at startup. */
    FakeConnector start(String... suffixes) throws IOException {
        Files.createFile(lockFile());
        for (String s : suffixes) {
            Files.createFile(file(s));
        }
        return this;
    }

    /** Truncates and writes, as IOHelper.writeText. */
    void write(String suffix, String content) throws IOException {
        try (var out = new FileOutputStream(file(suffix).toFile(), false)) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
        }
        Files.setLastModifiedTime(file(suffix), FileTime.from(Instant.ofEpochSecond(++clock)));
    }

    /** Leaves the file as a reader sees it in the middle of a rewrite: truncated, then only a part written. */
    void writeTorn(String suffix, String content) throws IOException {
        write(suffix, content.substring(0, content.length() / 2));
    }

    /** Appends, as IOHelper.appendText. */
    void append(String suffix, String content) throws IOException {
        try (var out = new FileOutputStream(file(suffix).toFile(), true)) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    static String status(String version, String routeState) {
        return "{\"runtime\":{\"pid\":1,\"platform\":\"Camel\"},"
                + "\"context\":{\"name\":\"app\",\"version\":\"" + version + "\",\"state\":\"Started\"},"
                + "\"routes\":[{\"routeId\":\"r1\",\"state\":\"" + routeState + "\"}]}";
    }

    /** Runs one action and returns its output, or null when the action writes none. */
    @FunctionalInterface
    interface ActionHandler {
        String run(String actionJson) throws IOException;
    }

    /**
     * Runs the pending actions as the connector's poll does: reads each action file, runs it, writes the output when
     * there is one and deletes the action file in a finally. Multi-slot (4.21+) also takes {pid}-action-{id}.json.
     */
    int runActions(boolean multiSlot, ActionHandler handler) throws IOException {
        String prefix = pid + "-action";
        List<Path> files;
        try (var list = Files.list(dir)) {
            files = list.filter(f -> {
                        String name = f.getFileName().toString();
                        return multiSlot
                                ? name.startsWith(prefix) && name.endsWith(".json")
                                : name.equals(prefix + ".json");
                    })
                    .toList();
        }
        int ran = 0;
        for (Path af : files) {
            String suffix = af.getFileName().toString().substring(prefix.length());
            Path of = suffix.startsWith("-")
                    ? dir.resolve(pid + "-output-" + suffix.substring(1, suffix.length() - 5) + ".json")
                    : file("output");
            try {
                String json = Files.readString(af);
                if (json.isEmpty()) {
                    continue;
                }
                ran++;
                String output = handler.run(json);
                if (output != null) {
                    try (var out = new FileOutputStream(of.toFile(), false)) {
                        out.write(output.getBytes(StandardCharsets.UTF_8));
                    }
                }
            } finally {
                Files.deleteIfExists(af);
            }
        }
        return ran;
    }

    /** A clock moved by hand. */
    static final class ManualClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
