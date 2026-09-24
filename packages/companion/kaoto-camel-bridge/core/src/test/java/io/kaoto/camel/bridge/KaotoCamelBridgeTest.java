package io.kaoto.camel.bridge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import io.kaoto.camel.bridge.spi.BridgeEventNotifier;
import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import org.apache.camel.impl.DefaultCamelContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class KaotoCamelBridgeTest {

    private static final KaotoCamelBridge BRIDGE_WITH_STUB =
            new KaotoCamelBridge((address, strategy) -> mock(WorkerWebSocketClient.class));

    @AfterEach
    void clearProperties() {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
    }

    @Test
    void configureTwiceRegistersOnlyOneStrategy() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "127.0.0.1:9000");
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "abc");
        var context = new DefaultCamelContext();

        BRIDGE_WITH_STUB.configure(context);
        new KaotoCamelBridge().configure(context); // second path (e.g. plugin)

        assertEquals(
                1,
                context.getLifecycleStrategies().stream()
                        .filter(s -> s instanceof BridgeLifecycleStrategy)
                        .count(),
                "configure must be idempotent per CamelContext");
        assertEquals(
                1,
                context.getManagementStrategy().getEventNotifiers().stream()
                        .filter(n -> n instanceof BridgeEventNotifier)
                        .count());
    }

    @Test
    void configureRegistersStrategyEvenWhenCompanionIsUnreachable() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "127.0.0.1:1");
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "abc");
        var context = new DefaultCamelContext();

        new KaotoCamelBridge().configure(context);

        assertTrue(
                context.getLifecycleStrategies().stream().anyMatch(s -> s instanceof BridgeLifecycleStrategy),
                "activation must not depend on the companion being reachable");
    }

    @Test
    void addressOnlyWithoutExecutionIdIsNoOp() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "127.0.0.1:8000");
        // EXECUTION_ID_PROPERTY not set
        var context = new DefaultCamelContext();

        BRIDGE_WITH_STUB.configure(context);

        assertEquals(
                0,
                context.getLifecycleStrategies().stream()
                        .filter(s -> s instanceof BridgeLifecycleStrategy)
                        .count(),
                "address without execution-id must be a no-op");
    }

    @Test
    void executionIdOnlyWithoutAddressIsNoOp() throws Exception {
        // ADDRESS_PROPERTY not set
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "abc");
        var context = new DefaultCamelContext();

        BRIDGE_WITH_STUB.configure(context);

        assertEquals(
                0,
                context.getLifecycleStrategies().stream()
                        .filter(s -> s instanceof BridgeLifecycleStrategy)
                        .count(),
                "execution-id without address must be a no-op");
    }

    @Test
    void malformedAddressIsNoOp() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "not-a-valid-host-port");
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "abc");
        var context = new DefaultCamelContext();

        BRIDGE_WITH_STUB.configure(context);

        assertEquals(
                0,
                context.getLifecycleStrategies().stream()
                        .filter(s -> s instanceof BridgeLifecycleStrategy)
                        .count(),
                "malformed address must be a no-op");
    }
}
