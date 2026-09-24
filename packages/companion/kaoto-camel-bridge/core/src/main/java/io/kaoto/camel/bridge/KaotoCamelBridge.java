package io.kaoto.camel.bridge;

import io.kaoto.camel.bridge.spi.BridgeEventNotifier;
import io.kaoto.camel.bridge.spi.BridgeLifecycleStrategy;
import io.kaoto.camel.bridge.transport.CompanionAddress;
import io.kaoto.camel.bridge.transport.WorkerWebSocketClient;
import java.util.function.BiFunction;
import java.util.logging.Logger;
import org.apache.camel.CamelConfiguration;
import org.apache.camel.CamelContext;
import org.apache.camel.spi.CamelContextCustomizer;

/**
 * Entry point for the Kaoto–Camel bridge. Every activation path ends here:
 *
 * <ul>
 *   <li><b>camel-main / Quarkus</b> — {@code camel.beans.kaotoBridge=#class:io.kaoto.camel.bridge.KaotoCamelBridge}
 *       binds an instance into the registry; camel-main's {@code loadConfigurations} then calls
 *       {@link CamelConfiguration#configure} on it.
 *   <li><b>Spring Boot</b> — the class is listed in {@code META-INF/spring/…AutoConfiguration.imports}; Spring
 *       registers it as a bean and camel-spring-boot picks it up as a {@link CamelContextCustomizer}.
 *   <li><b>Camel ≥ 4.15</b> — {@code KaotoBridgeContextServicePlugin} calls {@link #configure} from
 *       {@code ContextServicePlugin.load}.
 * </ul>
 *
 * <p>{@link #configure} is idempotent per context. When neither {@code kaoto.companion.address} nor
 * {@code kaoto.companion.execution-id} is set, the class is a strict no-op.
 */
public class KaotoCamelBridge implements CamelContextCustomizer, CamelConfiguration {

    private static final Logger LOG = Logger.getLogger(KaotoCamelBridge.class.getName());

    /** System property: companion host and port in {@code host:port} format. */
    public static final String ADDRESS_PROPERTY = "kaoto.companion.address";

    /** System property: execution identifier assigned by the companion. */
    public static final String EXECUTION_ID_PROPERTY = "kaoto.companion.execution-id";

    /** Factory for the transport; tests inject a stub through the package-private constructor. */
    private final BiFunction<CompanionAddress, BridgeLifecycleStrategy, WorkerWebSocketClient> clientFactory;

    /** Public no-arg constructor used by all runtimes. */
    public KaotoCamelBridge() {
        this((address, strategy) -> new WorkerWebSocketClient(
                address.toUri(),
                address.host() + ":" + address.port(),
                address.executionId(),
                strategy::handleCommand));
    }

    KaotoCamelBridge(BiFunction<CompanionAddress, BridgeLifecycleStrategy, WorkerWebSocketClient> clientFactory) {
        this.clientFactory = clientFactory;
    }

    @Override
    public void configure(CamelContext context) {
        String hostPort = System.getProperty(ADDRESS_PROPERTY);
        String executionId = System.getProperty(EXECUTION_ID_PROPERTY);

        boolean hasAddress = hostPort != null && !hostPort.isBlank();
        boolean hasExecutionId = executionId != null && !executionId.isBlank();

        if (!hasAddress && !hasExecutionId) {
            LOG.fine("Kaoto bridge properties not set — bridge is no-op");
            return;
        }
        if (hasAddress && !hasExecutionId) {
            LOG.warning("KaotoCamelBridge: " + ADDRESS_PROPERTY + " is set but " + EXECUTION_ID_PROPERTY
                    + " is missing — bridge disabled");
            return;
        }
        if (!hasAddress && hasExecutionId) {
            LOG.warning("KaotoCamelBridge: " + EXECUTION_ID_PROPERTY + " is set but " + ADDRESS_PROPERTY
                    + " is missing — bridge disabled");
            return;
        }

        if (isActivated(context)) {
            LOG.fine("Kaoto bridge already activated on context " + context.getName());
            return;
        }

        CompanionAddress address;
        try {
            address = CompanionAddress.parse(hostPort, executionId);
        } catch (IllegalArgumentException e) {
            LOG.warning("KaotoCamelBridge: invalid configuration — bridge disabled: " + e.getMessage());
            return;
        }

        LOG.info("KaotoCamelBridge activated for execution " + executionId + " (companion: " + hostPort + ")");

        try {
            var strategy = new BridgeLifecycleStrategy(executionId);
            var client = clientFactory.apply(address, strategy);
            strategy.setClient(client);
            context.addLifecycleStrategy(strategy);
            context.getManagementStrategy().addEventNotifier(new BridgeEventNotifier(executionId, client));
        } catch (Exception e) {
            LOG.warning(
                    "KaotoCamelBridge could not register with the CamelContext — bridge disabled: " + e.getMessage());
        }
    }

    /** True when a previous activation path already registered the bridge on this context. */
    static boolean isActivated(CamelContext context) {
        return context.getLifecycleStrategies().stream().anyMatch(BridgeLifecycleStrategy.class::isInstance);
    }
}
