package io.kaoto.companion.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.List;
import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = CompanionEvent.WorkerReady.class, name = "camel.worker.ready"),
    @JsonSubTypes.Type(value = CompanionEvent.WorkerStopping.class, name = "camel.worker.stopping"),
    @JsonSubTypes.Type(value = CompanionEvent.RouteStarted.class, name = "camel.route.started"),
    @JsonSubTypes.Type(value = CompanionEvent.RouteStopped.class, name = "camel.route.stopped"),
    @JsonSubTypes.Type(value = CompanionEvent.RouteSuspended.class, name = "camel.route.suspended"),
    @JsonSubTypes.Type(value = CompanionEvent.RouteResumed.class, name = "camel.route.resumed"),
    @JsonSubTypes.Type(value = CompanionEvent.ExchangeCompleted.class, name = "camel.exchange.completed"),
    @JsonSubTypes.Type(value = CompanionEvent.TelemetrySnapshot.class, name = "camel.telemetry.snapshot"),
    @JsonSubTypes.Type(value = CompanionEvent.CmdAck.class, name = "camel.cmd.ack"),
})
public sealed interface CompanionEvent
        permits CompanionEvent.WorkerReady,
                CompanionEvent.WorkerStopping,
                CompanionEvent.RouteStarted,
                CompanionEvent.RouteStopped,
                CompanionEvent.RouteSuspended,
                CompanionEvent.RouteResumed,
                CompanionEvent.ExchangeCompleted,
                CompanionEvent.TelemetrySnapshot,
                CompanionEvent.CmdAck {

    record WorkerReady(String executionId, String camelVersion, String bridgeVersion) implements CompanionEvent {}

    record WorkerStopping(String executionId, String reason) implements CompanionEvent {}

    record RouteStarted(String executionId, String routeId, String description) implements CompanionEvent {}

    record RouteStopped(String executionId, String routeId) implements CompanionEvent {}

    record RouteSuspended(String executionId, String routeId) implements CompanionEvent {}

    record RouteResumed(String executionId, String routeId) implements CompanionEvent {}

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
            implements CompanionEvent {}

    record TelemetrySnapshot(String executionId, List<RouteStats> routes) implements CompanionEvent {}

    record CmdAck(String executionId, String correlationId, boolean success, String detail) implements CompanionEvent {}
}
