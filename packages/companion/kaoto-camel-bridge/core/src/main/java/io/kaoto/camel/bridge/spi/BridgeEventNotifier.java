package io.kaoto.camel.bridge.spi;

import io.kaoto.camel.bridge.protocol.OutboundMessage;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.camel.spi.CamelEvent;
import org.apache.camel.support.EventNotifierSupport;

public class BridgeEventNotifier extends EventNotifierSupport {

    private final String executionId;
    private final WorkerWebSocketClient client;

    public BridgeEventNotifier(String executionId, WorkerWebSocketClient client) {
        this.executionId = executionId;
        this.client = client;
    }

    @Override
    public void notify(CamelEvent event) throws Exception {
        switch (event) {
            case CamelEvent.RouteStartedEvent e ->
                client.send(new OutboundMessage.RouteStarted(
                        executionId, e.getRoute().getRouteId(), e.getRoute().getDescription()));
            case CamelEvent.RouteStoppedEvent e ->
                client.send(new OutboundMessage.RouteStopped(
                        executionId, e.getRoute().getRouteId()));
            case CamelEvent.ExchangeCompletedEvent e -> {
                var exchange = e.getExchange();
                var body = exchange.getMessage().getBody(String.class);
                Map<String, String> headers = exchange.getMessage().getHeaders().entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, en -> Objects.toString(en.getValue(), "")));
                client.send(new OutboundMessage.ExchangeCompleted(
                        executionId,
                        exchange.getFromRouteId(),
                        exchange.getExchangeId(),
                        exchange.getClock().elapsed(),
                        exchange.isFailed(),
                        headers,
                        body != null && body.length() > 1024 ? body.substring(0, 1024) : body));
            }
            default -> {
                /* ignore */
            }
        }
    }

    @Override
    public boolean isEnabled(CamelEvent event) {
        return event instanceof CamelEvent.RouteStartedEvent
                || event instanceof CamelEvent.RouteStoppedEvent
                || event instanceof CamelEvent.ExchangeCompletedEvent;
    }
}
