package io.kaoto.camel.bridge.plugin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.kaoto.camel.bridge.KaotoCamelBridge;
import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import java.util.ServiceLoader;
import org.apache.camel.CamelContext;
import org.apache.camel.impl.DefaultCamelContext;
import org.apache.camel.spi.ContextServicePlugin;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Runs against Camel ${camel.plugin-api.version}, where AbstractCamelContext loads ContextServicePlugins. */
class KaotoBridgeContextServicePluginTest {

    private static final String ADDRESS = "127.0.0.1:1";
    private static final String EXECUTION_ID = "plugin-it";

    @AfterEach
    void clearAddress() {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
    }

    @Test
    void pluginIsDiscoveredByServiceLoader() {
        boolean found = ServiceLoader.load(ContextServicePlugin.class).stream()
                .anyMatch(p -> p.type() == KaotoBridgeContextServicePlugin.class);
        assertTrue(found, "META-INF/services/org.apache.camel.spi.ContextServicePlugin must list the adapter");
    }

    @Test
    void contextStartActivatesBridgeThroughThePlugin() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, ADDRESS);
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, EXECUTION_ID);
        var context = new DefaultCamelContext();
        context.start();
        try {
            assertEquals(1, bridgeStrategies(context));
        } finally {
            context.stop();
        }
    }

    @Test
    void beanPathAfterPluginPathDoesNotDoubleActivate() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, ADDRESS);
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, EXECUTION_ID);
        var context = new DefaultCamelContext();
        context.build(); // build phase runs the plugin; on a real host camel.beans / Spring would follow
        new KaotoCamelBridge().configure(context);
        context.start();
        try {
            assertEquals(1, bridgeStrategies(context));
        } finally {
            context.stop();
        }
    }

    @Test
    void withoutAddressPropertyPluginIsInert() throws Exception {
        var context = new DefaultCamelContext();
        context.start();
        try {
            assertEquals(0, bridgeStrategies(context));
        } finally {
            context.stop();
        }
    }

    private static long bridgeStrategies(CamelContext context) {
        return context.getLifecycleStrategies().stream()
                .filter(BridgeLifecycleStrategy.class::isInstance)
                .count();
    }
}
