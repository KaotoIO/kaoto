package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.kompanion.model.KompanionEvent;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnError;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.OpenConnections;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.inject.Inject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
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

    @ConfigProperty(name = "kaoto.kompanion.worker-token")
    Optional<String> workerToken;

    private final ObjectMapper mapper = new ObjectMapper();

    // connectionId -> protocol detected from the first frame
    private final Map<String, WorkerProtocol> protocols = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen() {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String remote = remoteAddress();
        if (executionId == null || executionId.isBlank()) {
            LOG.warnf("Worker connected without executionId (remote=%s) — closing", remote);
            connection.closeAndAwait();
            return;
        }
        if (workerToken.isPresent() && !workerToken.get().isBlank() && !tokenMatches(workerToken.get())) {
            LOG.warnf("Worker connected with a missing or wrong token (execution=%s remote=%s) — closing", executionId, remote);
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
        registry.register(
                executionId,
                connectionId,
                frame -> openConnections
                        .findByConnectionId(connectionId)
                        .ifPresent(conn -> conn.sendTextAndAwait(frame)));
    }

    @OnTextMessage
    public void onMessage(String frame) {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String connectionId = connection.id();
        try {
            JsonNode node = mapper.readTree(frame);
            WorkerProtocol protocol = protocols.get(connectionId);
            if (protocol == null) {
                protocol = WorkerProtocol.detect(node);
                if (protocol == null) {
                    LOG.warnf("Unrecognized first worker frame for execution=%s — ignored", executionId);
                    return;
                }
                protocols.put(connectionId, protocol);
                registry.protocolDetected(executionId, connectionId, protocol);
                LOG.infof("Worker protocol for execution=%s: %s", executionId, protocol);
            }
            if (protocol == WorkerProtocol.CONNECTOR) {
                onConnectorFrame(executionId, node, frame);
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
                LOG.warnf("Worker frame executionId mismatch: connection=%s frame=%s — ignored",
                        executionId, msg.executionId());
            } else {
                registry.receiveAck(executionId, msg.correlationId(), msg.success(), msg.detail());
            }
        }
        // Publish every frame to the SSE event bus (transparent pass-through)
        if ("camel.worker.ready".equals(msg.type())) {
            eventBus.publishReady(executionId, frame);
        } else {
            eventBus.publish(executionId, frame);
        }
    }

    private void onConnectorFrame(String executionId, JsonNode node, String frame) throws Exception {
        String type = node.path("type").asText();
        switch (type) {
            case "hello" -> eventBus.publishReady(
                    executionId, mapper.writeValueAsString(ConnectorProtocolCodec.ready(executionId, node)));
            case "result" -> {
                String requestId = node.path("requestId").asText(null);
                if (requestId != null) {
                    boolean ok = ConnectorProtocolCodec.success(node);
                    registry.receiveAck(
                            executionId,
                            requestId,
                            ok,
                            ok ? ConnectorProtocolCodec.summary(node) : ConnectorProtocolCodec.error(node));
                }
            }
            case "snapshot" -> {
                if ("status".equals(node.path("kind").asText())) {
                    publishEvent(executionId, ConnectorProtocolCodec.telemetry(executionId, node.path("data")));
                }
            }
            default -> LOG.debugf("Unknown connector frame type=%s for execution=%s", type, executionId);
        }
        // every connector frame is also published raw, so clients can use the richer data (trace, debug, ...)
        ObjectNode raw = (ObjectNode) node.deepCopy();
        raw.put("type", "camel.connector." + type);
        raw.put("executionId", executionId);
        eventBus.publish(executionId, mapper.writeValueAsString(raw));
    }

    private void publishEvent(String executionId, KompanionEvent event) throws Exception {
        eventBus.publish(executionId, mapper.writeValueAsString(event));
    }

    private boolean tokenMatches(String expected) {
        String header = connection.handshakeRequest().header("Authorization");
        String given = header != null && header.startsWith("Bearer ") ? header.substring(7) : "";
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8));
    }

    @OnClose
    public void onClose() {
        String executionId = queryParam(connection.handshakeRequest().query(), "executionId");
        String connectionId = connection.id();
        String remote = remoteAddress();
        if (executionId != null) {
            LOG.infof("Worker disconnected: execution=%s remote=%s connectionId=%s", executionId, remote, connectionId);
            protocols.remove(connectionId);
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
