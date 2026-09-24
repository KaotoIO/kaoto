package io.kaoto.camel.bridge;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import org.apache.camel.impl.DefaultCamelContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class KaotoCamelBridgeNoopTest {

    @AfterEach
    void clearProperties() {
        System.clearProperty(KaotoCamelBridge.ADDRESS_PROPERTY);
        System.clearProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY);
    }

    @Test
    void startingContextWithUnreachableCompanionDoesNotThrow() throws Exception {
        System.setProperty(KaotoCamelBridge.ADDRESS_PROPERTY, "127.0.0.1:1");
        System.setProperty(KaotoCamelBridge.EXECUTION_ID_PROPERTY, "noop");
        var context = new DefaultCamelContext();
        new KaotoCamelBridge().configure(context);

        assertDoesNotThrow(context::start);
        context.stop();
    }
}
