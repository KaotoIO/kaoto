package io.kaoto.camel.bridge.plugin;

import io.kaoto.camel.bridge.KaotoCamelBridge;
import org.apache.camel.CamelContext;
import org.apache.camel.spi.ContextServicePlugin;

/**
 * Camel 4.15+ activation path. Discovered by {@link java.util.ServiceLoader}; Camel calls {@link #load} during the
 * context build phase on every runtime. Delegates to the same idempotent {@link KaotoCamelBridge#configure}, so a host
 * that also activates the bridge via {@code camel.beans} or Spring gets a single activation.
 */
public class KaotoBridgeContextServicePlugin implements ContextServicePlugin {

    @Override
    public void load(CamelContext camelContext) {
        new KaotoCamelBridge().configure(camelContext);
    }

    @Override
    public void unload(CamelContext camelContext) {
        // BridgeLifecycleStrategy.onContextStopping already sends worker.stopping and closes the transport
    }
}
