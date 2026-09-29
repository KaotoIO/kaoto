package io.kaoto.kompanion.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;
import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = KompanionEvent.WorkerReady.class, name = "camel.worker.ready"),
    @JsonSubTypes.Type(value = KompanionEvent.WorkerStopping.class, name = "camel.worker.stopping"),
    @JsonSubTypes.Type(value = KompanionEvent.RouteStarted.class, name = "camel.route.started"),
    @JsonSubTypes.Type(value = KompanionEvent.RouteStopped.class, name = "camel.route.stopped"),
    @JsonSubTypes.Type(value = KompanionEvent.RouteSuspended.class, name = "camel.route.suspended"),
    @JsonSubTypes.Type(value = KompanionEvent.RouteResumed.class, name = "camel.route.resumed"),
    @JsonSubTypes.Type(value = KompanionEvent.ExchangeCompleted.class, name = "camel.exchange.completed"),
    @JsonSubTypes.Type(value = KompanionEvent.TelemetrySnapshot.class, name = "camel.telemetry.snapshot"),
    @JsonSubTypes.Type(value = KompanionEvent.CmdAck.class, name = "camel.cmd.ack"),
})
public sealed interface KompanionEvent
        permits KompanionEvent.WorkerReady,
                KompanionEvent.WorkerStopping,
                KompanionEvent.RouteStarted,
                KompanionEvent.RouteStopped,
                KompanionEvent.RouteSuspended,
                KompanionEvent.RouteResumed,
                KompanionEvent.ExchangeCompleted,
                KompanionEvent.TelemetrySnapshot,
                KompanionEvent.CmdAck {

    record WorkerReady(String executionId, String camelVersion, String bridgeVersion) implements KompanionEvent {}

    record WorkerStopping(String executionId, String reason) implements KompanionEvent {}

    record RouteStarted(String executionId, String routeId, String description) implements KompanionEvent {}

    record RouteStopped(String executionId, String routeId) implements KompanionEvent {}

    record RouteSuspended(String executionId, String routeId) implements KompanionEvent {}

    record RouteResumed(String executionId, String routeId) implements KompanionEvent {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RouteStats(
            String routeId,
            String status,
            long exchangesTotal,
            long exchangesFailed,
            long meanProcessingTimeMs,
            long uptimeMs) {}

    record ExchangeCompleted(
            String executionId,
            String routeId,
            String exchangeId,
            long elapsedMs,
            boolean failed,
            Map<String, String> headers,
            String body)
            implements KompanionEvent {}

    record TelemetrySnapshot(String executionId, List<RouteStats> routes) implements KompanionEvent {}

    record CmdAck(String executionId, String correlationId, boolean success, String detail) implements KompanionEvent {}
}
