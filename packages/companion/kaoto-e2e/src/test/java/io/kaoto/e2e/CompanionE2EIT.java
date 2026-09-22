package io.kaoto.e2e;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.e2e.support.CompanionProcess;
import io.kaoto.e2e.support.WorkloadFixtures;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Black-box end-to-end tests for the Kaoto Companion. These tests start a real companion process and interact with it
 * exclusively through its public HTTP API and WebSocket endpoint.
 *
 * <p>The full pipeline test (launch route → RUNNING → telemetry → suspend → resume → terminate) is gated on the
 * workspace-scoped execution API defined in the local-execution-design spec. The scaffold below verifies what is
 * available in the current milestone: companion startup handshake, /v1/info, /v1/executions (MVP), and the
 * /v1/worker/connect WebSocket endpoint.
 */
class CompanionE2EIT {

    private static CompanionProcess companion;
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @BeforeAll
    static void startCompanion() throws Exception {
        companion = CompanionProcess.start();
    }

    @AfterAll
    static void stopCompanion() {
        if (companion != null) companion.close();
    }

    @Test
    void companionStartsAndRespondsToInfoEndpoint() throws Exception {
        var resp = get(companion.baseUrl() + "/v1/info");
        assertEquals(200, resp.statusCode(), "Expected 200 from /v1/info, got: " + resp.body());
        var json = MAPPER.readTree(resp.body());
        assertEquals("kaoto-companion", json.path("name").asText());
        assertFalse(json.path("version").asText().isBlank());
    }

    @Test
    void postExecutionAccepted() throws Exception {
        String workspaceRoot = WorkloadFixtures.fixturesDir().toString();
        String payload = WorkloadFixtures.camelTimerMvpPayload(workspaceRoot, "camel-main:4.10.3");
        var resp = post(companion.baseUrl() + "/v1/executions", payload);
        // MVP endpoint returns 202 Accepted (dummy engine, no real execution)
        assertEquals(202, resp.statusCode(), "Expected 202, got: " + resp.body());
        var json = MAPPER.readTree(resp.body());
        assertEquals("ACCEPTED", json.path("status").asText());
    }

    @Test
    void workerConnectEndpointAcceptsWebSocketWithExecutionId() throws Exception {
        String executionId = "e2e-probe-" + System.currentTimeMillis();
        String wsUrl = companion.baseUrl().replace("http", "ws") + "/v1/worker/connect?executionId=" + executionId;

        var opened = new CompletableFuture<Void>();
        var ws = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .buildAsync(URI.create(wsUrl), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(1);
                        opened.complete(null);
                    }
                })
                .join();

        opened.get(5, TimeUnit.SECONDS);
        ws.sendClose(WebSocket.NORMAL_CLOSURE, "done").join();
    }

    // ---- helpers ----

    private HttpResponse<String> post(String url, String body) throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(String url) throws Exception {
        var req = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString());
    }
}
