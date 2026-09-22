package io.kaoto.companion.worker;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

@QuarkusTest
class WorkerWebSocketHandlerTest {

    @TestHTTPResource("/v1/worker/connect")
    URI wsUri;

    @Inject
    WorkerRegistry registry;

    @Inject
    ExecutionEventBus eventBus;

    @Test
    void connectRegistersAndDisconnectUnregisters() throws Exception {
        String executionId = "test-exec-lifecycle";
        URI uri = URI.create(wsUri.toString().replace("http", "ws") + "?executionId=" + executionId);

        var opened = new CompletableFuture<Void>();
        var ws = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .buildAsync(uri, new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(1);
                        opened.complete(null);
                    }
                })
                .join();

        opened.get(5, TimeUnit.SECONDS);
        assertTrue(registry.isConnected(executionId));

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "done").join();
        Thread.sleep(300);
        assertFalse(registry.isConnected(executionId));
    }

    @Test
    void ackFrameFromBridgeRoutedToRegistryReceiveAck() throws Exception {
        String executionId = "test-exec-ack-real-" + System.nanoTime();
        String correlationId = "corr-real-1";
        URI uri = URI.create(wsUri.toString().replace("http", "ws") + "?executionId=" + executionId);

        var opened = new CompletableFuture<Void>();
        var ws = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .buildAsync(uri, new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket webSocket) {
                        webSocket.request(1);
                        opened.complete(null);
                    }
                })
                .join();

        // Wait for onOpen to fire on the client, then poll until the server-side @OnOpen
        // handler has finished registering the execution — they run on different threads.
        opened.get(5, TimeUnit.SECONDS);
        for (int i = 0; i < 50 && !registry.isConnected(executionId); i++) {
            Thread.sleep(100);
        }
        assertTrue(registry.isConnected(executionId), "Server-side @OnOpen did not register execution in time");

        // Park a pending future in the registry — simulates CommandResource calling sendCommand
        var ackFuture = registry.sendCommand(executionId, correlationId, "{}");

        // Now send the camel.cmd.ack frame from the client; the server's onMessage must call
        // registry.receiveAck, which completes ackFuture
        ws.sendText(
                        "{\"type\":\"camel.cmd.ack\",\"executionId\":\""
                                + executionId
                                + "\",\"correlationId\":\""
                                + correlationId
                                + "\",\"success\":true}",
                        true)
                .join();

        // The future must complete via the server-side handler — not by any direct call in this test
        var result = ackFuture.get(5, TimeUnit.SECONDS);
        assertTrue(result.success());

        ws.sendClose(WebSocket.NORMAL_CLOSURE, "done").join();
        registry.unregister(executionId);
    }

    @Test
    void bridgeFrameIsPublishedToEventBus() throws Exception {
        String executionId = "test-exec-bus";
        URI uri = URI.create(wsUri.toString().replace("http", "ws") + "?executionId=" + executionId);

        var eventReceived = new CompletableFuture<String>();
        var opened = new CompletableFuture<Void>();
        var wsFuture = new CompletableFuture<java.net.http.WebSocket>();

        HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .buildAsync(uri, new java.net.http.WebSocket.Listener() {
                    @Override
                    public void onOpen(java.net.http.WebSocket ws) {
                        ws.request(1);
                        wsFuture.complete(ws);
                        opened.complete(null);
                    }
                })
                .join();

        opened.get(5, TimeUnit.SECONDS);

        // The server-side @OnOpen runs asynchronously; poll until the stream is registered
        io.smallrye.mutiny.Multi<String> stream = null;
        for (int i = 0; i < 50 && stream == null; i++) {
            stream = eventBus.streamFor(executionId);
            if (stream == null) Thread.sleep(100);
        }
        assertNotNull(stream, "Event bus stream was never created for " + executionId);

        // Subscribe to the bus BEFORE sending the frame
        stream.subscribe().with(eventReceived::complete);

        // Send the frame over the WebSocket wire so onMessage is exercised
        String jsonFrame =
                "{\"type\":\"camel.route.started\",\"executionId\":\"" + executionId + "\",\"routeId\":\"r1\"}";
        wsFuture.get(2, TimeUnit.SECONDS).sendText(jsonFrame, true).join();

        var received = eventReceived.get(2, TimeUnit.SECONDS);
        assertTrue(received.contains("camel.route.started"));
    }
}
