package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.kompanion.model.KompanionCommand;
import io.kaoto.kompanion.model.KompanionEvent;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Translates between Kompanion commands/events and the camel-cli-connector WebSocket envelope (protocol v1). */
public final class ConnectorProtocolCodec {

    public static final int VERSION = 1;

    private ConnectorProtocolCodec() {}

    /** Encodes a Kompanion command as a connector action frame, using the correlationId as requestId. */
    public static String encode(ObjectMapper mapper, KompanionCommand command, String correlationId) throws Exception {
        ObjectNode action = mapper.createObjectNode();
        switch (command) {
            case KompanionCommand.CmdRouteStart c -> route(action, "start", c.routeId());
            case KompanionCommand.CmdRouteStop c -> route(action, "stop", c.routeId());
            case KompanionCommand.CmdRouteSuspend c -> route(action, "suspend", c.routeId());
            case KompanionCommand.CmdRouteResume c -> route(action, "resume", c.routeId());
            case KompanionCommand.CmdExchangeInject c -> {
                action.put("action", "send");
                action.put("endpoint", c.endpoint());
                if (c.body() != null) action.put("body", c.body());
                if (c.bodyEncoding() != null) action.put("bodyEncoding", c.bodyEncoding());
                if (c.headers() != null && !c.headers().isEmpty()) {
                    // the connector's send action takes headers as a key/value array
                    ArrayNode headers = action.putArray("headers");
                    for (Map.Entry<String, String> h : c.headers().entrySet()) {
                        headers.addObject().put("key", h.getKey()).put("value", h.getValue());
                    }
                }
            }
            case KompanionCommand.CmdWorkerStop c -> action.put("action", "stop");
        }
        ObjectNode frame = mapper.createObjectNode();
        frame.put("v", VERSION);
        frame.put("type", "action");
        frame.put("requestId", correlationId);
        frame.set("action", action);
        return mapper.writeValueAsString(frame);
    }

    private static void route(ObjectNode action, String command, String routeId) {
        action.put("action", "route");
        action.put("command", command);
        action.put("id", routeId);
    }

    /** Short, human readable summary of a successful action result, used as the ack detail. */
    public static String summary(JsonNode frame) {
        JsonNode result = frame.path("result");
        // the send action reports failures (e.g. consumer not started) in its result, not as ok=false
        if (result.hasNonNull("status")) {
            return result.path("status").asText();
        }
        return "ok";
    }

    /** Whether a result frame represents a successful command (including the send action's own status). */
    public static boolean success(JsonNode frame) {
        if (!frame.path("ok").asBoolean(false)) {
            return false;
        }
        String status = frame.path("result").path("status").asText("success");
        return !"error".equals(status) && !"timeout".equals(status) && !"failed".equals(status);
    }

    public static String error(JsonNode frame) {
        if (frame.hasNonNull("error")) {
            return frame.path("error").asText();
        }
        JsonNode exception = frame.path("result").path("exception");
        if (!exception.isMissingNode()) {
            return exception.path("message").asText(exception.toString());
        }
        return summary(frame);
    }

    public static KompanionEvent.WorkerReady ready(String executionId, JsonNode hello) {
        return new KompanionEvent.WorkerReady(
                executionId,
                hello.path("camelVersion").asText(null),
                null,
                "camel-cli-connector/v" + hello.path("v").asInt());
    }

    /** Maps the connector's status snapshot (the content of the CLI status file) to a telemetry snapshot. */
    public static KompanionEvent.TelemetrySnapshot telemetry(String executionId, JsonNode status) {
        List<KompanionEvent.RouteStats> routes = new ArrayList<>();
        for (JsonNode r : status.path("routes")) {
            JsonNode stats = r.path("statistics");
            routes.add(new KompanionEvent.RouteStats(
                    r.path("routeId").asText(),
                    r.path("state").asText("UNKNOWN"),
                    stats.path("exchangesTotal").asLong(),
                    stats.path("exchangesFailed").asLong(),
                    stats.path("meanProcessingTime").asLong(),
                    0L));
        }
        return new KompanionEvent.TelemetrySnapshot(executionId, routes);
    }
}
