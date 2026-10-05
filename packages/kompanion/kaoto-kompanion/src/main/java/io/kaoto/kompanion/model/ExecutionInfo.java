package io.kaoto.kompanion.model;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** A worker connected to the Kompanion. */
public record ExecutionInfo(
        String executionId,

        @Schema(
                description =
                        "BRIDGE, CONNECTOR (camel-cli-connector over WebSocket) or FILE (camel-cli-connector files); null until the worker identified itself")
        String protocol,

        @Schema(description = "Camel version, when the worker reported it")
        String camelVersion,

        @Schema(description = "Name of the Camel context, when the worker reported it")
        String name,

        @Schema(description = "Process id of the app, when the worker reported it")
        Long pid) {}
