package io.kaoto.e2e;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.e2e.support.KompanionProcess;
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
 * Black-box end-to-end tests for the Kaoto Kompanion. These tests start a real kompanion process and interact with it
 * exclusively through its public HTTP API and WebSocket endpoint.
 *
 * <p>The full pipeline test (launch route → RUNNING → telemetry → suspend → resume → terminate) is gated on the
 * workspace-scoped execution API defined in the local-execution-design spec. The scaffold below verifies what is
 * available in the current milestone: kompanion startup handshake, /v1/info, /v1/executions (MVP), and the
 * /v1/worker/connect WebSocket endpoint.
 */
class KompanionE2EIT {

    private static KompanionProcess kompanion;
    private static final HttpClient HTTP = HttpClient.newHttpClient();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @BeforeAll
    static void startKompanion() throws Exception {
        kompanion = KompanionProcess.start();
    }

    @AfterAll
    static void stopKompanion() {
        if (kompanion != null) kompanion.close();
    }

    @Test
    void kompanionStartsAndRespondsToInfoEndpoint() throws Exception {
        var resp = get(kompanion.baseUrl() + "/v1/info");
        assertEquals(200, resp.statusCode(), "Expected 200 from /v1/info, got: " + resp.body());
        var json = MAPPER.readTree(resp.body());
        assertEquals("kaoto-kompanion", json.path("name").asText());
        assertFalse(json.path("version").asText().isBlank());
    }

    @Test
    void postExecutionAccepted() throws Exception {
        String workspaceRoot = WorkloadFixtures.fixturesDir().toString();
        String payload = WorkloadFixtures.camelTimerMvpPayload(workspaceRoot, "camel-main:4.10.3");
        var resp = post(kompanion.baseUrl() + "/v1/executions", payload);
        // MVP endpoint returns 202 Accepted (dummy engine, no real execution)
        assertEquals(202, resp.statusCode(), "Expected 202, got: " + resp.body());
        var json = MAPPER.readTree(resp.body());
        assertEquals("ACCEPTED", json.path("status").asText());
    }

    @Test
    void workerConnectEndpointAcceptsWebSocketWithExecutionId() throws Exception {
        String executionId = "e2e-probe-" + System.currentTimeMillis();
        String wsUrl = kompanion.baseUrl().replace("http", "ws") + "/v1/worker/connect?executionId=" + executionId;

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
