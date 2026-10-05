package io.kaoto.e2e.support;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** A fixture Camel application launched as a separate JVM, with its output captured to a log file. */
public class FixtureApp implements AutoCloseable {

    private final Process process;
    private final Path log;

    private FixtureApp(Process process, Path log) {
        this.process = process;
        this.log = log;
    }

    /** Launches a Camel Main fixture from its Maven target directory (classes + lib/). */
    public static FixtureApp startCamelMain(Path targetDir, List<String> systemProperties) throws Exception {
        String cp = targetDir.resolve("classes") + File.pathSeparator + targetDir.resolve("lib") + File.separator + "*";
        List<String> cmd = new ArrayList<>();
        cmd.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
        cmd.addAll(systemProperties);
        cmd.add("-cp");
        cmd.add(cp);
        cmd.add("org.apache.camel.main.Main");
        Path log = Files.createTempFile(targetDir, "fixture-", ".log");
        Process p = new ProcessBuilder(cmd)
                .redirectErrorStream(true)
                .redirectOutput(log.toFile())
                .start();
        return new FixtureApp(p, log);
    }

    public String log() {
        try {
            return Files.readString(log);
        } catch (Exception e) {
            return "";
        }
    }

    public Path logFile() {
        return log;
    }

    public boolean waitForExit(long timeout, TimeUnit unit) throws InterruptedException {
        return process.waitFor(timeout, unit);
    }

    public long pid() {
        return process.pid();
    }

    public boolean isAlive() {
        return process.isAlive();
    }

    @Override
    public void close() throws Exception {
        if (process.isAlive()) {
            process.destroy();
            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.destroyForcibly();
            }
        }
    }
}
