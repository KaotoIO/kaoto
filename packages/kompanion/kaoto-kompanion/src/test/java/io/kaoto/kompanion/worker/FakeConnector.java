package io.kaoto.kompanion.worker;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;

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
}
