package io.kaoto.companion.worker;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** Minimal POJO for deserializing frames sent by the bridge subprocess. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkerMessage(
        String type,
        String executionId,
        String correlationId,
        boolean success,
        String detail,
        String routeId,
        String reason) {}
