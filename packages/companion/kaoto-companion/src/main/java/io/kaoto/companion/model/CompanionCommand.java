package io.kaoto.companion.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.Map;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = CompanionCommand.CmdRouteStart.class, name = "camel.cmd.route.start"),
    @JsonSubTypes.Type(value = CompanionCommand.CmdRouteStop.class, name = "camel.cmd.route.stop"),
    @JsonSubTypes.Type(value = CompanionCommand.CmdRouteSuspend.class, name = "camel.cmd.route.suspend"),
    @JsonSubTypes.Type(value = CompanionCommand.CmdRouteResume.class, name = "camel.cmd.route.resume"),
    @JsonSubTypes.Type(value = CompanionCommand.CmdExchangeInject.class, name = "camel.cmd.exchange.inject"),
    @JsonSubTypes.Type(value = CompanionCommand.CmdWorkerStop.class, name = "camel.cmd.worker.stop"),
})
@Schema(
        oneOf = {
            CompanionCommand.CmdRouteStart.class,
            CompanionCommand.CmdRouteStop.class,
            CompanionCommand.CmdRouteSuspend.class,
            CompanionCommand.CmdRouteResume.class,
            CompanionCommand.CmdExchangeInject.class,
            CompanionCommand.CmdWorkerStop.class,
        })
public sealed interface CompanionCommand
        permits CompanionCommand.CmdRouteStart,
                CompanionCommand.CmdRouteStop,
                CompanionCommand.CmdRouteSuspend,
                CompanionCommand.CmdRouteResume,
                CompanionCommand.CmdExchangeInject,
                CompanionCommand.CmdWorkerStop {

    @Schema(description = "Start a Camel route")
    record CmdRouteStart(String routeId) implements CompanionCommand {}

    @Schema(description = "Stop a Camel route")
    record CmdRouteStop(String routeId) implements CompanionCommand {}

    @Schema(description = "Suspend a Camel route")
    record CmdRouteSuspend(String routeId) implements CompanionCommand {}

    @Schema(description = "Resume a Camel route")
    record CmdRouteResume(String routeId) implements CompanionCommand {}

    @Schema(description = "Inject an exchange into a Camel endpoint")
    record CmdExchangeInject(
            String endpoint,
            Map<String, String> headers,
            String body,

            @Schema(description = "Encoding of the body field. Use 'base64' for binary content, omit for plain text.")
            String bodyEncoding)
            implements CompanionCommand {}

    @Schema(description = "Stop the companion worker")
    record CmdWorkerStop() implements CompanionCommand {}
}
