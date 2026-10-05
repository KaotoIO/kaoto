package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
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
    ConnectorFrameHandler connectorFrames;

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
        eventBus.open(executionId, connectionId);
        // one send at a time: concurrent sends of large (fragmented) frames interleave on the wire, which the worker
        // rejects as a protocol error
        Object sendLock = new Object();
        registry.register(
                executionId,
                connectionId,
                frame -> openConnections.findByConnectionId(connectionId).ifPresent(conn -> {
                    synchronized (sendLock) {
                        conn.sendTextAndAwait(frame);
                    }
                }));
    }

    @OnTextMessage
    public void onMessage(String frame) {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String connectionId = connection.id();
        try {
            JsonNode node = mapper.readTree(frame);
            // the registry owns the protocol of the connection; until the first recognized frame it is unknown
            WorkerProtocol protocol = registry.protocolOf(executionId, connectionId);
            if (protocol == null) {
                protocol = WorkerProtocol.detect(node);
                if (protocol == null) {
                    // not enough to tell the protocol: pass the frame through like a bridge frame and keep detecting
                    LOG.debugf("Unrecognized worker frame before protocol detection for execution=%s", executionId);
                    onBridgeFrame(executionId, frame);
                    return;
                }
                registry.protocolDetected(executionId, connectionId, protocol);
                LOG.infof("Worker protocol for execution=%s: %s", executionId, protocol);
            }
            if (protocol == WorkerProtocol.CONNECTOR) {
                connectorFrames.onFrame(executionId, node);
            } else {
                onBridgeFrame(executionId, frame);
            }
        } catch (Exception e) {
            LOG.warnf("Failed to deserialize worker frame: %s", e.getMessage());
        }
    }

    private void onBridgeFrame(String executionId, String frame) throws Exception {
        var msg = mapper.readValue(frame, WorkerMessage.class);
        LOG.debugf("Received worker frame type=%s executionId=%s", msg.type(), msg.executionId());
        if ("camel.cmd.ack".equals(msg.type())) {
            if (!executionId.equals(msg.executionId())) {
                LOG.warnf(
                        "Worker frame executionId mismatch: connection=%s frame=%s — ignored",
                        executionId, msg.executionId());
            } else {
                registry.receiveAck(executionId, msg.correlationId(), msg.success(), msg.detail());
            }
        }
        // Publish every frame to the SSE event bus (transparent pass-through)
        if ("camel.worker.ready".equals(msg.type())) {
            eventBus.publishReady(executionId, frame);
        } else if ("camel.telemetry.snapshot".equals(msg.type())) {
            eventBus.publishState(executionId, "telemetry", frame);
        } else {
            eventBus.publish(executionId, frame);
        }
    }

    @OnClose
    public void onClose() {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String connectionId = connection.id();
        String remote = remoteAddress();
        if (executionId != null) {
            LOG.infof("Worker disconnected: execution=%s remote=%s connectionId=%s", executionId, remote, connectionId);
            registry.unregister(executionId, connectionId);
            eventBus.close(executionId, connectionId);
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
