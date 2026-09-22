package io.kaoto.camel.bridge.spi;

import io.kaoto.camel.bridge.protocol.InboundMessage;
import io.kaoto.camel.bridge.protocol.OutboundMessage;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.Base64;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;
import org.apache.camel.CamelContext;
import org.apache.camel.Route;
import org.apache.camel.support.LifecycleStrategySupport;

public class BridgeLifecycleStrategy extends LifecycleStrategySupport {

    private static final Logger LOG = Logger.getLogger(BridgeLifecycleStrategy.class.getName());
    private static final long TELEMETRY_INTERVAL_SECONDS = 5;

    private final String executionId;
    private WorkerWebSocketClient client;
    private final Map<String, BridgeRoutePolicy> routePolicies = new ConcurrentHashMap<>();
    private ScheduledExecutorService scheduler;
    private CamelContext camelContext;

    public BridgeLifecycleStrategy(String executionId) {
        this.executionId = executionId;
    }

    public void setClient(WorkerWebSocketClient client) {
        this.client = client;
    }

    @Override
    public void onContextStarting(CamelContext context) {
        if (client != null && !client.connect()) {
            LOG.warning("[Kaoto Camel Bridge] companion unreachable — events for execution " + executionId
                    + " will be dropped");
        }
    }

    @Override
    public void onContextStarted(CamelContext context) {
        this.camelContext = context;
        String camelVersion = context.getVersion();
        String bridgeVersion = getClass().getPackage().getImplementationVersion();
        client.send(new OutboundMessage.WorkerReady(
                executionId, camelVersion, bridgeVersion != null ? bridgeVersion : "dev"));

        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            var t = new Thread(r, "kaoto-bridge-telemetry");
            t.setDaemon(true);
            return t;
        });
        scheduler.scheduleAtFixedRate(
                this::pushTelemetry, TELEMETRY_INTERVAL_SECONDS, TELEMETRY_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    @Override
    public void onContextStopping(CamelContext context) {
        client.send(new OutboundMessage.WorkerStopping(executionId, "natural"));
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
    }

    @Override
    public void onRoutesAdd(Collection<Route> routes) {
        for (Route route : routes) {
            var policy = new BridgeRoutePolicy(executionId, client);
            route.getRoutePolicyList().add(policy);
            routePolicies.put(route.getRouteId(), policy);
        }
    }

    /** Called by WorkerWebSocketClient when an inbound command arrives. */
    public void handleCommand(InboundMessage cmd) {
        switch (cmd) {
            case InboundMessage.CmdWorkerStop c -> {
                client.send(new OutboundMessage.CmdAck(executionId, c.correlationId(), true, null));
                try {
                    camelContext.stop();
                } catch (Exception e) {
                    LOG.warning("Error stopping CamelContext: " + e.getMessage());
                }
            }
            case InboundMessage.CmdRouteStart c -> dispatchToRoutePolicy(c, c.routeId());
            case InboundMessage.CmdRouteStop c -> dispatchToRoutePolicy(c, c.routeId());
            case InboundMessage.CmdRouteSuspend c -> dispatchToRoutePolicy(c, c.routeId());
            case InboundMessage.CmdRouteResume c -> dispatchToRoutePolicy(c, c.routeId());
            case InboundMessage.CmdExchangeInject c -> injectExchange(c);
        }
    }

    private void injectExchange(InboundMessage.CmdExchangeInject cmd) {
        boolean success = true;
        String detail = null;
        var producer = camelContext.createProducerTemplate();
        try {
            var endpoint = camelContext.getEndpoint(cmd.endpoint());
            if (endpoint == null) {
                throw new IllegalArgumentException("Unknown endpoint: " + cmd.endpoint());
            }
            Map<String, Object> headers = cmd.headers() != null ? Map.copyOf(cmd.headers()) : Map.of();
            Object body = "base64".equalsIgnoreCase(cmd.bodyEncoding())
                    ? Base64.getDecoder().decode(cmd.body())
                    : cmd.body();
            producer.sendBodyAndHeaders(endpoint, body, headers);
        } catch (Exception e) {
            success = false;
            detail = e.getMessage();
            LOG.warning("Exchange injection failed for endpoint " + cmd.endpoint() + ": " + e.getMessage());
        } finally {
            try {
                producer.stop();
            } catch (Exception ignored) {
            }
        }
        client.send(new OutboundMessage.CmdAck(executionId, cmd.correlationId(), success, detail));
    }

    private void dispatchToRoutePolicy(InboundMessage cmd, String routeId) {
        String correlationId =
                switch (cmd) {
                    case InboundMessage.CmdRouteStart c -> c.correlationId();
                    case InboundMessage.CmdRouteStop c -> c.correlationId();
                    case InboundMessage.CmdRouteSuspend c -> c.correlationId();
                    case InboundMessage.CmdRouteResume c -> c.correlationId();
                    default -> null;
                };
        var policy = routePolicies.get(routeId);
        if (policy == null) {
            LOG.warning("No route policy found for routeId: " + routeId);
            client.send(new OutboundMessage.CmdAck(
                    executionId, correlationId, false, "No route policy found for routeId: " + routeId));
            return;
        }
        var route = camelContext.getRoute(routeId);
        if (route == null) {
            LOG.warning("Route not found in CamelContext for routeId: " + routeId);
            client.send(new OutboundMessage.CmdAck(
                    executionId, correlationId, false, "Route not found in CamelContext for routeId: " + routeId));
            return;
        }
        policy.handleCommand(cmd, route);
    }

    private void pushTelemetry() {
        if (camelContext == null) return;
        var stats = camelContext.getRoutes().stream()
                .map(route -> new OutboundMessage.RouteStats(
                        route.getRouteId(), "UNKNOWN", 0L, 0L, 0L, route.getUptimeMillis()))
                .toList();
        client.send(new OutboundMessage.TelemetrySnapshot(executionId, stats));
    }
}
