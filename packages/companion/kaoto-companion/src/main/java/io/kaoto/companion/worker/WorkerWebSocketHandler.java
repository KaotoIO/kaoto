package io.kaoto.companion.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnError;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

@WebSocket(path = "/v1/worker/connect")
public class WorkerWebSocketHandler {

    private static final Logger LOG = Logger.getLogger(WorkerWebSocketHandler.class);

    @Inject
    WorkerRegistry registry;

    @Inject
    ExecutionEventBus eventBus;

    @Inject
    WebSocketConnection connection;

    @Inject
    OpenConnections openConnections;

    private final ObjectMapper mapper = new ObjectMapper();

    @OnOpen
    public void onOpen() {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String remote = remoteAddress();
        if (executionId == null || executionId.isBlank()) {
            LOG.warnf("Worker connected without executionId (remote=%s) — closing", remote);
            connection.closeAndAwait();
            return;
        }
        // Capture the connection ID as a plain String while the session scope is active.
        // The lambda must NOT close over `connection` (a @SessionScoped proxy) because it
        // will be called from an unscoped HTTP executor thread and would throw
        // ContextNotActiveException. Instead, look up the live connection by ID at send time.
        String connectionId = connection.id();
        LOG.infof("Worker connected: execution=%s remote=%s connectionId=%s", executionId, remote, connectionId);
        eventBus.open(executionId);
        registry.register(
                executionId,
                frame -> openConnections
                        .findByConnectionId(connectionId)
                        .ifPresent(conn -> conn.sendTextAndAwait(frame)));
    }

    @OnTextMessage
    public void onMessage(String frame) {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        try {
            var msg = mapper.readValue(frame, WorkerMessage.class);
            LOG.debugf("Received worker frame type=%s executionId=%s", msg.type(), msg.executionId());
            if ("camel.cmd.ack".equals(msg.type())) {
                registry.receiveAck(msg.executionId(), msg.correlationId(), msg.success(), msg.detail());
            }
            // Publish every frame to the SSE event bus (transparent pass-through)
            eventBus.publish(executionId, frame);
        } catch (Exception e) {
            LOG.warnf("Failed to deserialize worker frame: %s", e.getMessage());
        }
    }

    @OnClose
    public void onClose() {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String remote = remoteAddress();
        if (executionId != null) {
            LOG.infof("Worker disconnected: execution=%s remote=%s", executionId, remote);
            registry.unregister(executionId);
            eventBus.close(executionId);
        }
    }

    @OnError
    public void onError(Throwable t) {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        LOG.errorf(t, "Worker WebSocket error for execution %s: %s", executionId, t.getMessage());
    }

    /** Extract a single query parameter value from a raw query string. */
    private static String queryParam(String query, String name) {
        if (query == null || query.isBlank()) return null;
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                return pair.substring(eq + 1);
            }
        }
        return null;
    }

    private String remoteAddress() {
        try {
            String remote = connection.handshakeRequest().remoteAddress();
            return remote != null ? remote : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }
}
