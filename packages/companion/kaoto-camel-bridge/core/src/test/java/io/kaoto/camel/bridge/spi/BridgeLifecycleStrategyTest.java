package io.kaoto.camel.bridge.spi;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import io.kaoto.camel.bridge.protocol.InboundMessage;
import io.kaoto.camel.bridge.protocol.OutboundMessage;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.impl.DefaultCamelContext;
import org.junit.jupiter.api.Test;

class BridgeLifecycleStrategyTest {

    @Test
    void onContextStartingConnectsAndToleratesUnreachableCompanion() {
        var strategy = new BridgeLifecycleStrategy("exec-1");
        var client = new WorkerWebSocketClient(
                "ws://127.0.0.1:1/v1/worker/connect?executionId=exec-1",
                "127.0.0.1:1",
                "exec-1",
                strategy::handleCommand);
        strategy.setClient(client);

        assertDoesNotThrow(() -> strategy.onContextStarting(new DefaultCamelContext()));
        assertFalse(client.isConnected());
    }

    @Test
    void onContextStartedWithoutConnectionDoesNotThrow() {
        var strategy = new BridgeLifecycleStrategy("exec-1");
        var client = new WorkerWebSocketClient(
                "ws://127.0.0.1:1/v1/worker/connect?executionId=exec-1",
                "127.0.0.1:1",
                "exec-1",
                strategy::handleCommand);
        strategy.setClient(client);
        var context = new DefaultCamelContext();

        assertDoesNotThrow(() -> strategy.onContextStarted(context));
        assertDoesNotThrow(() -> strategy.onContextStopping(context));
    }

    @Test
    void exchangeInjectSendsBodyToEndpoint() throws Exception {
        var sent = new ArrayList<OutboundMessage>();
        var client = mockClient(sent);
        var strategy = new BridgeLifecycleStrategy("exec-inject");
        strategy.setClient(client);

        var received = new CountDownLatch(1);
        var bodies = new ArrayList<String>();

        var context = new DefaultCamelContext();
        context.addRoutes(new RouteBuilder() {
            @Override
            public void configure() {
                from("direct:inject-test").id("inject-test").process(exchange -> {
                    bodies.add(exchange.getIn().getBody(String.class));
                    received.countDown();
                });
            }
        });
        context.addLifecycleStrategy(strategy);
        context.start();

        try {
            strategy.handleCommand(
                    new InboundMessage.CmdExchangeInject("corr-1", "direct:inject-test", Map.of(), "hello", null));

            assertTrue(received.await(3, TimeUnit.SECONDS), "Exchange was not received by the endpoint");
            assertEquals("hello", bodies.get(0));
        } finally {
            context.stop();
        }
    }

    @Test
    void exchangeInjectAcksSuccess() throws Exception {
        var sent = new ArrayList<OutboundMessage>();
        var client = mockClient(sent);
        var strategy = new BridgeLifecycleStrategy("exec-inject-ack");
        strategy.setClient(client);

        var context = new DefaultCamelContext();
        context.addRoutes(new RouteBuilder() {
            @Override
            public void configure() {
                from("direct:ack-test").id("ack-test").to("mock:ack-output");
            }
        });
        context.addLifecycleStrategy(strategy);
        context.start();

        try {
            strategy.handleCommand(
                    new InboundMessage.CmdExchangeInject("corr-2", "direct:ack-test", Map.of(), "ping", null));

            Thread.sleep(500);
            var ack = sent.stream()
                    .filter(m -> m instanceof OutboundMessage.CmdAck)
                    .map(m -> (OutboundMessage.CmdAck) m)
                    .filter(a -> "corr-2".equals(a.correlationId()))
                    .findFirst();
            assertTrue(ack.isPresent(), "No CmdAck sent for corr-2");
            assertTrue(ack.get().success(), "CmdAck should report success");
        } finally {
            context.stop();
        }
    }

    @Test
    void exchangeInjectUnknownEndpointAcksFailure() throws Exception {
        var sent = new ArrayList<OutboundMessage>();
        var client = mockClient(sent);
        var strategy = new BridgeLifecycleStrategy("exec-inject-fail");
        strategy.setClient(client);

        var context = new DefaultCamelContext();
        context.addLifecycleStrategy(strategy);
        context.start();

        try {
            strategy.handleCommand(
                    new InboundMessage.CmdExchangeInject("corr-3", "direct:no-such-endpoint", Map.of(), "body", null));

            Thread.sleep(500);
            var ack = sent.stream()
                    .filter(m -> m instanceof OutboundMessage.CmdAck)
                    .map(m -> (OutboundMessage.CmdAck) m)
                    .filter(a -> "corr-3".equals(a.correlationId()))
                    .findFirst();
            assertTrue(ack.isPresent(), "No CmdAck sent for corr-3");
            assertFalse(ack.get().success(), "CmdAck should report failure for unknown endpoint");
        } finally {
            context.stop();
        }
    }

    @Test
    void exchangeInjectBase64DecodesBodyToBytes() throws Exception {
        var sent = new ArrayList<OutboundMessage>();
        var client = mockClient(sent);
        var strategy = new BridgeLifecycleStrategy("exec-inject-b64");
        strategy.setClient(client);

        var received = new CountDownLatch(1);
        var bodies = new ArrayList<Object>();

        var context = new DefaultCamelContext();
        context.addRoutes(new RouteBuilder() {
            @Override
            public void configure() {
                from("direct:b64-test").id("b64-test").process(exchange -> {
                    bodies.add(exchange.getIn().getBody());
                    received.countDown();
                });
            }
        });
        context.addLifecycleStrategy(strategy);
        context.start();

        try {
            byte[] original = new byte[] {1, 2, 3, 4};
            String encoded = java.util.Base64.getEncoder().encodeToString(original);
            strategy.handleCommand(
                    new InboundMessage.CmdExchangeInject("corr-b64", "direct:b64-test", Map.of(), encoded, "base64"));

            assertTrue(received.await(3, TimeUnit.SECONDS), "Exchange was not received");
            assertInstanceOf(byte[].class, bodies.get(0));
            assertArrayEquals(original, (byte[]) bodies.get(0));
        } finally {
            context.stop();
        }
    }

    @Test
    void dispatchToRoutePolicyUnknownRouteIdAcksFailure() throws Exception {
        var sent = new ArrayList<OutboundMessage>();
        var client = mockClient(sent);
        var strategy = new BridgeLifecycleStrategy("exec-unknown-route");
        strategy.setClient(client);

        var context = new DefaultCamelContext();
        context.addLifecycleStrategy(strategy);
        context.start();

        try {
            strategy.handleCommand(new InboundMessage.CmdRouteStop("corr-unknown", "no-such-route"));

            var ack = sent.stream()
                    .filter(m -> m instanceof OutboundMessage.CmdAck)
                    .map(m -> (OutboundMessage.CmdAck) m)
                    .filter(a -> "corr-unknown".equals(a.correlationId()))
                    .findFirst();
            assertTrue(ack.isPresent(), "No CmdAck sent for corr-unknown");
            assertFalse(ack.get().success(), "CmdAck should report failure for unknown routeId");
        } finally {
            context.stop();
        }
    }

    private static WorkerWebSocketClient mockClient(List<OutboundMessage> sent) {
        var client = mock(WorkerWebSocketClient.class);
        org.mockito.Mockito.doAnswer(inv -> {
                    sent.add(inv.getArgument(0));
                    return null;
                })
                .when(client)
                .send(org.mockito.ArgumentMatchers.any());
        return client;
    }
}
