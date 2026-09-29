package io.kaoto.kompanion.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.Map;
import java.util.Objects;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = KompanionCommand.CmdRouteStart.class, name = "camel.cmd.route.start"),
    @JsonSubTypes.Type(value = KompanionCommand.CmdRouteStop.class, name = "camel.cmd.route.stop"),
    @JsonSubTypes.Type(value = KompanionCommand.CmdRouteSuspend.class, name = "camel.cmd.route.suspend"),
    @JsonSubTypes.Type(value = KompanionCommand.CmdRouteResume.class, name = "camel.cmd.route.resume"),
    @JsonSubTypes.Type(value = KompanionCommand.CmdExchangeInject.class, name = "camel.cmd.exchange.inject"),
    @JsonSubTypes.Type(value = KompanionCommand.CmdWorkerStop.class, name = "camel.cmd.worker.stop"),
})
@Schema(
        oneOf = {
            KompanionCommand.CmdRouteStart.class,
            KompanionCommand.CmdRouteStop.class,
            KompanionCommand.CmdRouteSuspend.class,
            KompanionCommand.CmdRouteResume.class,
            KompanionCommand.CmdExchangeInject.class,
            KompanionCommand.CmdWorkerStop.class,
        })
public sealed interface KompanionCommand
        permits KompanionCommand.CmdRouteStart,
                KompanionCommand.CmdRouteStop,
                KompanionCommand.CmdRouteSuspend,
                KompanionCommand.CmdRouteResume,
                KompanionCommand.CmdExchangeInject,
                KompanionCommand.CmdWorkerStop {

    @Schema(description = "Start a Camel route")
    record CmdRouteStart(String routeId) implements KompanionCommand {
        public CmdRouteStart {
            if (routeId == null || routeId.isBlank()) throw new IllegalArgumentException("routeId must not be blank");
        }
    }

    @Schema(description = "Stop a Camel route")
    record CmdRouteStop(String routeId) implements KompanionCommand {
        public CmdRouteStop {
            if (routeId == null || routeId.isBlank()) throw new IllegalArgumentException("routeId must not be blank");
        }
    }

    @Schema(description = "Suspend a Camel route")
    record CmdRouteSuspend(String routeId) implements KompanionCommand {
        public CmdRouteSuspend {
            if (routeId == null || routeId.isBlank()) throw new IllegalArgumentException("routeId must not be blank");
        }
    }

    @Schema(description = "Resume a Camel route")
    record CmdRouteResume(String routeId) implements KompanionCommand {
        public CmdRouteResume {
            if (routeId == null || routeId.isBlank()) throw new IllegalArgumentException("routeId must not be blank");
        }
    }

    @Schema(description = "Inject an exchange into a Camel endpoint")
    record CmdExchangeInject(
            String endpoint,
            Map<String, String> headers,
            String body,

            @Schema(description = "Encoding of the body field. Use 'base64' for binary content, omit for plain text.")
            String bodyEncoding)
            implements KompanionCommand {
        public CmdExchangeInject {
            Objects.requireNonNull(endpoint, "endpoint must not be null");
            if (endpoint.isBlank()) throw new IllegalArgumentException("endpoint must not be blank");
        }
    }

    @Schema(description = "Stop the kompanion worker")
    record CmdWorkerStop() implements KompanionCommand {}
}
