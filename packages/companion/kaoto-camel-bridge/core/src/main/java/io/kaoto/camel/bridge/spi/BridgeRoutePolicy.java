package io.kaoto.camel.bridge.spi;

import io.kaoto.camel.bridge.protocol.InboundMessage;
import io.kaoto.camel.bridge.protocol.OutboundMessage;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.logging.Logger;
import org.apache.camel.Route;
import org.apache.camel.support.RoutePolicySupport;

public class BridgeRoutePolicy extends RoutePolicySupport {

    private static final Logger LOG = Logger.getLogger(BridgeRoutePolicy.class.getName());

    private final String executionId;
    private final WorkerWebSocketClient client;

    public BridgeRoutePolicy(String executionId, WorkerWebSocketClient client) {
        this.executionId = executionId;
        this.client = client;
    }

    @Override
    public void onSuspend(Route route) {
        client.send(new OutboundMessage.RouteSuspended(executionId, route.getRouteId()));
    }

    @Override
    public void onResume(Route route) {
        client.send(new OutboundMessage.RouteResumed(executionId, route.getRouteId()));
    }

    /**
     * Execute a route lifecycle command received from the companion. Called by BridgeLifecycleStrategy when a
     * cmd.route.* inbound message arrives.
     */
    public void handleCommand(InboundMessage cmd, Route route) {
        var routeController = route.getCamelContext().getRouteController();
        String correlationId = extractCorrelationId(cmd);
        boolean success = true;
        String detail = null;
        try {
            switch (cmd) {
                case InboundMessage.CmdRouteStart c -> routeController.startRoute(route.getRouteId());
                case InboundMessage.CmdRouteStop c -> routeController.stopRoute(route.getRouteId());
                case InboundMessage.CmdRouteSuspend c -> routeController.suspendRoute(route.getRouteId());
                case InboundMessage.CmdRouteResume c -> routeController.resumeRoute(route.getRouteId());
                case InboundMessage.CmdWorkerStop c ->
                    // Worker-stop is handled by BridgeLifecycleStrategy, not by a route policy
                    LOG.warning("BridgeRoutePolicy received unexpected CmdWorkerStop for route: " + route.getRouteId());
                case InboundMessage.CmdExchangeInject c ->
                    // Exchange injection is handled by BridgeLifecycleStrategy, not by a route policy
                    LOG.warning(
                            "BridgeRoutePolicy received unexpected CmdExchangeInject for route: " + route.getRouteId());
            }
        } catch (Exception e) {
            success = false;
            detail = e.getMessage();
        }
        client.send(new OutboundMessage.CmdAck(executionId, correlationId, success, detail));
    }

    private String extractCorrelationId(InboundMessage cmd) {
        return switch (cmd) {
            case InboundMessage.CmdRouteStart c -> c.correlationId();
            case InboundMessage.CmdRouteStop c -> c.correlationId();
            case InboundMessage.CmdRouteSuspend c -> c.correlationId();
            case InboundMessage.CmdRouteResume c -> c.correlationId();
            case InboundMessage.CmdWorkerStop c -> c.correlationId();
            case InboundMessage.CmdExchangeInject c -> c.correlationId();
        };
    }
}
