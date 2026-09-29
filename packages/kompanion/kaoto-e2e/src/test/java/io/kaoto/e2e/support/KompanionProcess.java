package io.kaoto.e2e.support;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.Writer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Starts and stops the kompanion JAR process for e2e tests. Mirrors the exact sequence the VS Code extension follows.
 */
public class KompanionProcess implements AutoCloseable {

    private Process process;
    private int port;

    public static KompanionProcess start() throws Exception {
        String jarPath = System.getProperty("kaoto.kompanion.jar");
        if (jarPath == null) {
            throw new IllegalStateException("System property kaoto.kompanion.jar not set");
        }
        var cp = new KompanionProcess();
        cp.process = new ProcessBuilder("java", "-jar", jarPath)
                .redirectErrorStream(true)
                .start();

        var reader = new BufferedReader(new InputStreamReader(cp.process.getInputStream()));
        // Read output on a background thread so the 30-second deadline is enforced independently
        // of blocking readLine() calls. If the process stays alive without producing a newline the
        // deadline will still fire and fail fast instead of hanging the build.
        ExecutorService lineReader = Executors.newSingleThreadExecutor(r -> {
            var t = new Thread(r, "kompanion-stdout-reader");
            t.setDaemon(true);
            return t;
        });
        Future<Integer> portFuture = lineReader.submit(() -> {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("KAOTO_KOMPANION_PORT=")) {
                    return Integer.parseInt(line.substring("KAOTO_KOMPANION_PORT=".length()).trim());
                }
            }
            return -1;
        });
        try {
            int port = portFuture.get(30, TimeUnit.SECONDS);
            if (port <= 0) {
                throw new RuntimeException("Kompanion exited before printing KAOTO_KOMPANION_PORT");
            }
            cp.port = port;
        } catch (TimeoutException e) {
            portFuture.cancel(true);
            cp.close();
            throw new RuntimeException("Timed out waiting for KAOTO_KOMPANION_PORT", e);
        } catch (ExecutionException e) {
            cp.close();
            throw new RuntimeException("Error reading kompanion output", e.getCause());
        } catch (Exception e) {
            cp.close();
            throw e;
        } finally {
            lineReader.shutdown();
        }

        // Drain remaining stdout in background to prevent pipe buffer blocking
        Thread.ofVirtual().start(() -> {
            try {
                reader.transferTo(Writer.nullWriter());
            } catch (Exception ignored) {
            }
        });

        try {
            cp.awaitReady();
        } catch (Exception e) {
            cp.close();
            throw e;
        }
        return cp;
    }

    public int getPort() {
        return port;
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + port;
    }

    private void awaitReady() throws Exception {
        var client = HttpClient.newHttpClient();
        var deadline = Instant.now().plus(Duration.ofSeconds(10));
        while (Instant.now().isBefore(deadline)) {
            try {
                var req = HttpRequest.newBuilder()
                        .uri(URI.create(baseUrl() + "/v1/info"))
                        .GET()
                        .build();
                var resp = client.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200) return;
            } catch (Exception ignored) {
            }
            Thread.sleep(200);
        }
        throw new RuntimeException("Kompanion did not become ready within 10 s");
    }

    @Override
    public void close() {
        if (process != null && process.isAlive()) {
            process.destroy();
            try {
                if (!process.waitFor(5, TimeUnit.SECONDS)) {
                    process.destroyForcibly();
                    process.waitFor(5, TimeUnit.SECONDS);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                process.destroyForcibly();
            }
        }
    }
}
