package io.kaoto.camel.bridge.protocol;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;
import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = OutboundMessage.WorkerReady.class, name = "camel.worker.ready"),
    @JsonSubTypes.Type(value = OutboundMessage.WorkerStopping.class, name = "camel.worker.stopping"),
    @JsonSubTypes.Type(value = OutboundMessage.RouteStarted.class, name = "camel.route.started"),
    @JsonSubTypes.Type(value = OutboundMessage.RouteStopped.class, name = "camel.route.stopped"),
    @JsonSubTypes.Type(value = OutboundMessage.RouteSuspended.class, name = "camel.route.suspended"),
    @JsonSubTypes.Type(value = OutboundMessage.RouteResumed.class, name = "camel.route.resumed"),
    @JsonSubTypes.Type(value = OutboundMessage.ExchangeCompleted.class, name = "camel.exchange.completed"),
    @JsonSubTypes.Type(value = OutboundMessage.TelemetrySnapshot.class, name = "camel.telemetry.snapshot"),
    @JsonSubTypes.Type(value = OutboundMessage.CmdAck.class, name = "camel.cmd.ack"),
})
public sealed interface OutboundMessage
        permits OutboundMessage.WorkerReady,
                OutboundMessage.WorkerStopping,
                OutboundMessage.RouteStarted,
                OutboundMessage.RouteStopped,
                OutboundMessage.RouteSuspended,
                OutboundMessage.RouteResumed,
                OutboundMessage.ExchangeCompleted,
                OutboundMessage.TelemetrySnapshot,
                OutboundMessage.CmdAck {

    record WorkerReady(String executionId, String camelVersion, String bridgeVersion) implements OutboundMessage {}

    record WorkerStopping(String executionId, String reason) implements OutboundMessage {}

    record RouteStarted(String executionId, String routeId, String description) implements OutboundMessage {}

    record RouteStopped(String executionId, String routeId) implements OutboundMessage {}

    record RouteSuspended(String executionId, String routeId) implements OutboundMessage {}

    record RouteResumed(String executionId, String routeId) implements OutboundMessage {}

    record ExchangeCompleted(
            String executionId,
            String routeId,
            String exchangeId,
            long elapsedMs,
            boolean failed,
            Map<String, String> headers,
            String body)
            implements OutboundMessage {}

    record RouteStats(
            String routeId,
            String status,
            long exchangesTotal,
            long exchangesFailed,
            long meanProcessingTimeMs,
            long uptimeMs) {}

    record TelemetrySnapshot(String executionId, List<RouteStats> routes) implements OutboundMessage {}

    record CmdAck(String executionId, String correlationId, boolean success, String detail)
            implements OutboundMessage {}
}
