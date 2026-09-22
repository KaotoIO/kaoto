package io.kaoto.camel.bridge.it.springboot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.kaoto.camel.bridge.KaotoCamelBridge;
import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import org.apache.camel.CamelContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(classes = ItApplication.class, properties = "kaoto.it.mode=active")
class SpringBootActivationTest {

    static {
        // read by KaotoCamelBridge.configure, which runs while the Spring context is being built
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "127.0.0.1:1");
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "sb-it");
    }

    @Autowired
    CamelContext camelContext;

    @Autowired
    KaotoCamelBridge bridge;

    @Test
    void bridgeIsRegisteredAsSpringBeanByTheImportsFile() {
        assertNotNull(bridge);
    }

    @Test
    void bridgeIsActivatedExactlyOnce() {
        assertEquals(
                1,
                camelContext.getLifecycleStrategies().stream()
                        .filter(BridgeLifecycleStrategy.class::isInstance)
                        .count());
    }
}
