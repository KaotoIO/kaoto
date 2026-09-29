package io.kaoto.camel.bridge.it.quarkus;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.apache.camel.CamelContext;
import org.junit.jupiter.api.Test;

@QuarkusTest
class QuarkusActivationTest {

    @Inject
    CamelContext camelContext;

    @Test
    void camelBeansPropertyActivatesBridgeExactlyOnce() {
        assertEquals(
                1,
                camelContext.getLifecycleStrategies().stream()
                        .filter(BridgeLifecycleStrategy.class::isInstance)
                        .count());
    }
}
