package io.kaoto.camel.bridge.it.springboot;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.kaoto.camel.bridge.KaotoCamelBridge;
import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import org.apache.camel.CamelContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** Distinct {@code properties} value forces a separate cached Spring context from the activation test. */
@SpringBootTest(classes = ItApplication.class, properties = "kaoto.it.mode=noop")
class SpringBootNoopTest {

    static {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
    }

    @Autowired
    CamelContext camelContext;

    @Test
    void withoutAddressPropertyNothingIsRegistered() {
        assertEquals(
                0,
                camelContext.getLifecycleStrategies().stream()
                        .filter(BridgeLifecycleStrategy.class::isInstance)
                        .count());
    }
}
