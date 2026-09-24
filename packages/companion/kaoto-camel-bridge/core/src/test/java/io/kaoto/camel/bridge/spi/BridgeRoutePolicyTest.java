package io.kaoto.camel.bridge.spi;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import io.kaoto.camel.bridge.protocol.InboundMessage;
import io.kaoto.camel.bridge.protocol.OutboundMessage;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.ArrayList;
import java.util.List;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.impl.DefaultCamelContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class BridgeRoutePolicyTest {

    private static final String EXEC_ID = "test-exec";
    private static final String ROUTE_ID = "test-route";

    private DefaultCamelContext context;
    private List<OutboundMessage> sent;
    private WorkerWebSocketClient client;

    @BeforeEach
    void setUp() throws Exception {
        sent = new ArrayList<>();
        client = mock(WorkerWebSocketClient.class);
        org.mockito.Mockito.doAnswer(inv -> {
                    sent.add(inv.getArgument(0));
                    return null;
                })
                .when(client)
                .send(org.mockito.ArgumentMatchers.any());

        context = new DefaultCamelContext();
        context.addRoutes(new RouteBuilder() {
            @Override
            public void configure() {
                from("direct:" + ROUTE_ID).id(ROUTE_ID).to("mock:output");
            }
        });

        var strategy = new BridgeLifecycleStrategy(EXEC_ID);
        strategy.setClient(client);
        context.addLifecycleStrategy(strategy);
        context.start();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (context.isStarted()) {
            context.stop();
        }
    }

    @Test
    void stopCommandAcksSuccess() throws Exception {
        var policy = routePolicy();
        var route = context.getRoute(ROUTE_ID);
        policy.handleCommand(new InboundMessage.CmdRouteStop("corr-stop", ROUTE_ID), route);

        var ack = sent.stream()
                .filter(m -> m instanceof OutboundMessage.CmdAck)
                .map(m -> (OutboundMessage.CmdAck) m)
                .filter(a -> "corr-stop".equals(a.correlationId()))
                .findFirst();
        assertTrue(ack.isPresent(), "No CmdAck sent");
        assertTrue(ack.get().success(), "Stop should succeed");
    }

    @Test
    void startCommandAcksSuccess() throws Exception {
        // stop first so we can start it
        var policy = routePolicy();
        var route = context.getRoute(ROUTE_ID);
        policy.handleCommand(new InboundMessage.CmdRouteStop("corr-stop2", ROUTE_ID), route);
        sent.clear();

        policy.handleCommand(new InboundMessage.CmdRouteStart("corr-start", ROUTE_ID), route);

        var ack = sent.stream()
                .filter(m -> m instanceof OutboundMessage.CmdAck)
                .map(m -> (OutboundMessage.CmdAck) m)
                .filter(a -> "corr-start".equals(a.correlationId()))
                .findFirst();
        assertTrue(ack.isPresent(), "No CmdAck sent");
        assertTrue(ack.get().success(), "Start should succeed");
    }

    @Test
    void suspendCommandAcksSuccess() throws Exception {
        var policy = routePolicy();
        var route = context.getRoute(ROUTE_ID);
        policy.handleCommand(new InboundMessage.CmdRouteSuspend("corr-suspend", ROUTE_ID), route);

        var ack = sent.stream()
                .filter(m -> m instanceof OutboundMessage.CmdAck)
                .map(m -> (OutboundMessage.CmdAck) m)
                .filter(a -> "corr-suspend".equals(a.correlationId()))
                .findFirst();
        assertTrue(ack.isPresent(), "No CmdAck sent");
        assertTrue(ack.get().success(), "Suspend should succeed");
    }

    @Test
    void resumeCommandAcksSuccess() throws Exception {
        // suspend first so we can resume it
        var policy = routePolicy();
        var route = context.getRoute(ROUTE_ID);
        policy.handleCommand(new InboundMessage.CmdRouteSuspend("corr-suspend2", ROUTE_ID), route);
        sent.clear();

        policy.handleCommand(new InboundMessage.CmdRouteResume("corr-resume", ROUTE_ID), route);

        var ack = sent.stream()
                .filter(m -> m instanceof OutboundMessage.CmdAck)
                .map(m -> (OutboundMessage.CmdAck) m)
                .filter(a -> "corr-resume".equals(a.correlationId()))
                .findFirst();
        assertTrue(ack.isPresent(), "No CmdAck sent");
        assertTrue(ack.get().success(), "Resume should succeed");
    }

    private BridgeRoutePolicy routePolicy() {
        return (BridgeRoutePolicy) context.getRoute(ROUTE_ID).getRoutePolicyList().stream()
                .filter(p -> p instanceof BridgeRoutePolicy)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No BridgeRoutePolicy on route " + ROUTE_ID));
    }
}
