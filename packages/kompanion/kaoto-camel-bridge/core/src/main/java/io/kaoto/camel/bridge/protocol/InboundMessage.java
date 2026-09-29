package io.kaoto.camel.bridge.protocol;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import java.util.Map;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = InboundMessage.CmdRouteStart.class, name = "camel.cmd.route.start"),
    @JsonSubTypes.Type(value = InboundMessage.CmdRouteStop.class, name = "camel.cmd.route.stop"),
    @JsonSubTypes.Type(value = InboundMessage.CmdRouteSuspend.class, name = "camel.cmd.route.suspend"),
    @JsonSubTypes.Type(value = InboundMessage.CmdRouteResume.class, name = "camel.cmd.route.resume"),
    @JsonSubTypes.Type(value = InboundMessage.CmdWorkerStop.class, name = "camel.cmd.worker.stop"),
    @JsonSubTypes.Type(value = InboundMessage.CmdExchangeInject.class, name = "camel.cmd.exchange.inject"),
})
public sealed interface InboundMessage
        permits InboundMessage.CmdRouteStart,
                InboundMessage.CmdRouteStop,
                InboundMessage.CmdRouteSuspend,
                InboundMessage.CmdRouteResume,
                InboundMessage.CmdWorkerStop,
                InboundMessage.CmdExchangeInject {

    record CmdRouteStart(String correlationId, String routeId) implements InboundMessage {}

    record CmdRouteStop(String correlationId, String routeId) implements InboundMessage {}

    record CmdRouteSuspend(String correlationId, String routeId) implements InboundMessage {}

    record CmdRouteResume(String correlationId, String routeId) implements InboundMessage {}

    record CmdWorkerStop(String correlationId) implements InboundMessage {}

    record CmdExchangeInject(
            String correlationId, String endpoint, Map<String, String> headers, String body, String bodyEncoding)
            implements InboundMessage {}
}
