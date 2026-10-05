package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

/**
 * Handles the frames of a camel-cli-connector worker ({@code hello}, {@code result}, {@code snapshot}), whatever the
 * transport they came from: the WebSocket transport sends them as they are, the file transport synthesizes them from
 * the files the connector writes.
 */
@ApplicationScoped
public class ConnectorFrameHandler {

    private static final Logger LOG = Logger.getLogger(ConnectorFrameHandler.class);

    @Inject
    WorkerRegistry registry;

    @Inject
    ExecutionEventBus eventBus;

    private final ObjectMapper mapper = new ObjectMapper();

    /** Handles one connector frame. The node is retagged in place and must not be used by the caller afterwards. */
    public void onFrame(String executionId, JsonNode node) throws Exception {
        if (!node.isObject()) {
            LOG.debugf("Ignoring non-object connector frame for execution=%s", executionId);
            return;
        }
        String type = node.path("type").asText();
        switch (type) {
            case "hello" -> {
                JsonNode pid = node.path("runtime").path("pid");
                registry.workerDescribed(
                        executionId,
                        node.path("camelVersion").asText(null),
                        node.path("name").asText(null),
                        pid.canConvertToLong() ? pid.asLong() : null);
                eventBus.publishReady(
                        executionId, mapper.writeValueAsString(ConnectorProtocolCodec.ready(executionId, node)));
            }
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
                    // periodic: a slow SSE client only needs the latest one
                    eventBus.publishSnapshot(
                            executionId,
                            mapper.writeValueAsString(
                                    ConnectorProtocolCodec.telemetry(executionId, node.path("data"))));
                }
            }
            default -> LOG.debugf("Unknown connector frame type=%s for execution=%s", type, executionId);
        }
        // every connector frame is also published raw, so clients can use the richer data (trace, debug, ...). The
        // parsed tree is not used after this point, so it is retagged in place (snapshots are several MB)
        ObjectNode raw = (ObjectNode) node;
        raw.put("type", "camel.connector." + type);
        raw.put("executionId", executionId);
        String rawFrame = mapper.writeValueAsString(raw);
        if ("snapshot".equals(type)) {
            eventBus.publishSnapshot(executionId, rawFrame);
        } else {
            eventBus.publish(executionId, rawFrame);
        }
    }
}
