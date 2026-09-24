package io.kaoto.camel.bridge;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import org.apache.camel.CamelContext;
import org.apache.camel.main.Main;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Boots the real camel-main runtime and checks the two property-driven activation paths. */
class CamelMainActivationTest {

    private static final String ADDRESS = "127.0.0.1:1";
    private static final String EXECUTION_ID = "main-it";
    private static final String BRIDGE_CLASS = "io.kaoto.camel.bridge.KaotoCamelBridge";

    @BeforeEach
    void setProperties() {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, ADDRESS);
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, EXECUTION_ID);
    }

    @AfterEach
    void clearProperties() {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
    }

    @Test
    void camelBeansPropertyActivatesBridgeOnce() throws Exception {
        var main = new Main();
        main.addInitialProperty("camel.beans.kaotoBridge", "#class:" + BRIDGE_CLASS);
        assertActivatedOnce(main);
    }

    @Test
    void configurationClassesPropertyActivatesBridgeOnce() throws Exception {
        var main = new Main();
        main.addInitialProperty("camel.main.configurationClasses", BRIDGE_CLASS);
        assertActivatedOnce(main);
    }

    @Test
    void withoutAddressPropertyBridgeIsInert() throws Exception {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
        var main = new Main();
        main.addInitialProperty("camel.beans.kaotoBridge", "#class:" + BRIDGE_CLASS);
        main.start();
        try {
            assertEquals(0, bridgeStrategies(main.getCamelContext()));
        } finally {
            main.stop();
        }
    }

    private static void assertActivatedOnce(Main main) throws Exception {
        main.start();
        try {
            assertEquals(1, bridgeStrategies(main.getCamelContext()));
        } finally {
            main.stop();
        }
    }

    private static long bridgeStrategies(CamelContext context) {
        return context.getLifecycleStrategies().stream()
                .filter(BridgeLifecycleStrategy.class::isInstance)
                .count();
    }
}
