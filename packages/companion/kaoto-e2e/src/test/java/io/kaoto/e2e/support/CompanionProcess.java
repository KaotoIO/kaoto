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

/**
 * Starts and stops the companion JAR process for e2e tests. Mirrors the exact sequence the VS Code extension follows.
 */
public class CompanionProcess implements AutoCloseable {

    private Process process;
    private int port;

    public static CompanionProcess start() throws Exception {
        String jarPath = System.getProperty("kaoto.companion.jar");
        if (jarPath == null) {
            throw new IllegalStateException("System property kaoto.companion.jar not set");
        }
        var cp = new CompanionProcess();
        cp.process = new ProcessBuilder("java", "-jar", jarPath)
                .redirectErrorStream(true)
                .start();

        var reader = new BufferedReader(new InputStreamReader(cp.process.getInputStream()));
        try {
            var deadline = Instant.now().plus(Duration.ofSeconds(30));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.startsWith("KAOTO_COMPANION_PORT=")) {
                    cp.port = Integer.parseInt(
                            line.substring("KAOTO_COMPANION_PORT=".length()).trim());
                    break;
                }
                if (Instant.now().isAfter(deadline)) {
                    throw new RuntimeException("Timed out waiting for KAOTO_COMPANION_PORT");
                }
            }
        } catch (Exception e) {
            cp.close();
            throw e;
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
        throw new RuntimeException("Companion did not become ready within 10 s");
    }

    @Override
    public void close() {
        if (process != null && process.isAlive()) {
            process.destroy();
            try {
                process.waitFor();
            } catch (InterruptedException ignored) {
            }
        }
    }
}
