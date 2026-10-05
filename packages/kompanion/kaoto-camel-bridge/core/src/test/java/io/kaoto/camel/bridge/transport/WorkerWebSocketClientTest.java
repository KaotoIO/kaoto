package io.kaoto.camel.bridge.transport;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.kaoto.camel.bridge.protocol.OutboundMessage;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class WorkerWebSocketClientTest {

    /** Port 1 is never listening — connection is refused immediately. */
    private static final String UNREACHABLE_URI = "ws://127.0.0.1:1/v1/worker/connect?executionId=t";

    private static final String UNREACHABLE_HOST_PORT = "127.0.0.1:1";
    private static final String EXECUTION_ID = "t";

    private static WorkerWebSocketClient unreachable() {
        return new WorkerWebSocketClient(UNREACHABLE_URI, UNREACHABLE_HOST_PORT, EXECUTION_ID, m -> {});
    }

    @Test
    void constructorDoesNotConnect() {
        assertFalse(unreachable().isConnected(), "constructor must not open the connection");
    }

    @Test
    void connectToUnreachableAddressReturnsFalseAndDoesNotThrow() {
        var client = unreachable();
        assertFalse(assertDoesNotThrow(client::connect));
        assertFalse(client.isConnected());
    }

    @Test
    void sendBeforeConnectIsDropped() {
        assertDoesNotThrow(() -> unreachable().send(new OutboundMessage.WorkerStopping("t", "natural")));
    }

    @Test
    void closeBeforeConnectDoesNotThrow() {
        assertDoesNotThrow(unreachable()::close);
    }

    @Test
    void constructorWithTokenDoesNotConnect() {
        var client = new WorkerWebSocketClient(UNREACHABLE_URI, UNREACHABLE_HOST_PORT, EXECUTION_ID, "secret", m -> {});
        assertFalse(client.isConnected());
        assertFalse(assertDoesNotThrow(client::connect));
    }

    /**
     * Starts a minimal raw TCP server that performs the WebSocket handshake, captures the HTTP request headers, and
     * verifies that the client sends {@code Authorization: Bearer <token>}.
     */
    @Test
    void connectWithTokenSendsBearerAuthorizationHeader() throws Exception {
        CompletableFuture<String> authHeader = new CompletableFuture<>();

        try (ServerSocket server = new ServerSocket(0)) {
            int port = server.getLocalPort();

            // Background thread: accept one connection, complete the WS handshake, capture the Authorization header.
            Thread acceptor = new Thread(() -> {
                try (Socket socket = server.accept()) {
                    BufferedReader reader =
                            new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                    String wsKey = null;
                    String auth = null;
                    String line;
                    while ((line = reader.readLine()) != null && !line.isEmpty()) {
                        if (line.toLowerCase().startsWith("sec-websocket-key:")) {
                            wsKey = line.substring(line.indexOf(':') + 1).strip();
                        } else if (line.toLowerCase().startsWith("authorization:")) {
                            auth = line.substring(line.indexOf(':') + 1).strip();
                        }
                    }
                    authHeader.complete(auth != null ? auth : "");

                    // Send a valid 101 response so the JDK client considers the handshake successful.
                    String accept = Base64.getEncoder()
                            .encodeToString(MessageDigest.getInstance("SHA-1")
                                    .digest((wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
                                            .getBytes(StandardCharsets.UTF_8)));
                    OutputStream out = socket.getOutputStream();
                    out.write(("HTTP/1.1 101 Switching Protocols\r\n"
                                    + "Upgrade: websocket\r\n"
                                    + "Connection: Upgrade\r\n"
                                    + "Sec-WebSocket-Accept: " + accept + "\r\n"
                                    + "\r\n")
                            .getBytes(StandardCharsets.UTF_8));
                    out.flush();
                    // Hold the socket open briefly so the client does not see an immediate close.
                    Thread.sleep(200);
                } catch (Exception e) {
                    authHeader.completeExceptionally(e);
                }
            });
            acceptor.setDaemon(true);
            acceptor.start();

            String uri = "ws://127.0.0.1:" + port + "/v1/worker/connect?executionId=t";
            var client = new WorkerWebSocketClient(uri, "127.0.0.1:" + port, EXECUTION_ID, "my-secret", m -> {});
            assertTrue(client.connect(), "WebSocket handshake must succeed");
            client.close();

            String received = authHeader.get(5, TimeUnit.SECONDS);
            assertTrue(
                    received.equals("Bearer my-secret"),
                    "Expected 'Authorization: Bearer my-secret' but got: '" + received + "'");
        }
    }
}
