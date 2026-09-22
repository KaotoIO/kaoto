package io.kaoto.camel.bridge.transport;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.camel.bridge.protocol.InboundMessage;
import io.kaoto.camel.bridge.protocol.OutboundMessage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * WebSocket client that dials the companion. Construction is side-effect free; {@link #connect()} opens the connection
 * and is called by {@code BridgeLifecycleStrategy.onContextStarting}. While not connected, {@link #send} drops messages
 * so a missing companion never breaks the host application.
 */
public class WorkerWebSocketClient implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(WorkerWebSocketClient.class.getName());
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private final ObjectMapper mapper = new ObjectMapper();
    private final String uri;
    private final String hostPort;
    private final String executionId;
    private final Consumer<InboundMessage> onCommand;
    private volatile WebSocket ws;

    public WorkerWebSocketClient(String uri, String hostPort, String executionId, Consumer<InboundMessage> onCommand) {
        this.uri = uri;
        this.hostPort = hostPort;
        this.executionId = executionId;
        this.onCommand = onCommand;
    }

    /**
     * Opens the connection. Safe to call more than once.
     *
     * @return {@code true} when connected, {@code false} when the companion could not be reached
     */
    public synchronized boolean connect() {
        if (ws != null) {
            return true;
        }
        LOG.info("Connecting to Kaoto companion at " + uri);
        try {
            ws = HttpClient.newHttpClient()
                    .newWebSocketBuilder()
                    .connectTimeout(CONNECT_TIMEOUT)
                    .buildAsync(URI.create(uri), new Listener(mapper, onCommand))
                    .join();
            LOG.info("Connected to Kaoto companion (execution: " + executionId + ")");
            return true;
        } catch (Exception e) {
            LOG.warning(
                    "Could not connect to Kaoto companion at " + hostPort + " — bridge stays inert: " + e.getMessage());
            return false;
        }
    }

    public boolean isConnected() {
        return ws != null;
    }

    public void send(OutboundMessage message) {
        WebSocket socket = ws;
        if (socket == null) {
            LOG.fine("Dropping " + message.getClass().getSimpleName() + ": not connected");
            return;
        }
        try {
            socket.sendText(mapper.writeValueAsString(message), true);
        } catch (Exception e) {
            LOG.warning("Failed to send worker message: " + e.getMessage());
        }
    }

    @Override
    public void close() {
        WebSocket socket = ws;
        if (socket != null) {
            socket.sendClose(WebSocket.NORMAL_CLOSURE, "worker stopping");
        }
    }

    private static class Listener implements WebSocket.Listener {

        private final ObjectMapper mapper;
        private final Consumer<InboundMessage> onCommand;
        private final StringBuilder buffer = new StringBuilder();

        Listener(ObjectMapper mapper, Consumer<InboundMessage> onCommand) {
            this.mapper = mapper;
            this.onCommand = onCommand;
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            webSocket.request(1);
            buffer.append(data);
            if (last) {
                String frame = buffer.toString();
                buffer.setLength(0);
                try {
                    var msg = mapper.readValue(frame, InboundMessage.class);
                    onCommand.accept(msg);
                } catch (Exception e) {
                    LOG.warning("Failed to deserialize inbound message: " + e.getMessage());
                }
            }
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            LOG.severe("Worker WebSocket error: " + error.getMessage());
        }
    }
}
