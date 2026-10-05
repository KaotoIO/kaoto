package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.kompanion.model.KompanionCommand;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Turns features of a camel-cli-connector app on while SSE clients ask for them, and back off once none does: the
 * mechanism of trace and debug on demand. A client asks with {@code ensure} in its filter (see
 * {@link ExecutionEventBus.Filter}); nothing happens for the clients that do not.
 *
 * <ul>
 *   <li>trace: turned on with the {@code trace} action when the first client asks, unless it is on already (then it is
 *       the user's, and never turned off), and off when the last one is gone, if the Kompanion turned it on. Tracing
 *       needs the tracer woven into the routes at startup ({@code camel.trace.standby} or {@code enabled}): without it
 *       the clients get a {@code kompanion.unavailable} event.
 *   <li>debug: the same with the {@code debug} action ({@code enable} / {@code disable}), from the debug snapshot.
 *   <li>breakpoints: one added by a command of a client ({@code X-Kompanion-Subscription}) is owned by it, and removed
 *       (by id: the connector removes all of them without one) once no client owning it is left.
 * </ul>
 *
 * Turning off waits {@code kaoto.kompanion.demand.release-delay} (0 by default), so a client that comes back in time
 * (switching views, reconnecting) does not turn a feature off and on again.
 */
@ApplicationScoped
public class ConnectorDemand {

    private static final Logger LOG = Logger.getLogger(ConnectorDemand.class);

    /** The features a client can ask for. */
    public static final List<String> FEATURES = List.of("trace", "debug");

    // the state of a feature may not be there yet (the connector writes the debug snapshot every other poll)
    int stateAttempts = 5;
    long stateRetryMs = 1000;

    @Inject
    ExecutionEventBus eventBus;

    @Inject
    WorkerRegistry registry;

    @ConfigProperty(name = "kaoto.kompanion.demand.release-delay", defaultValue = "0s")
    Duration releaseDelay = Duration.ZERO;

    private final ObjectMapper mapper = new ObjectMapper();

    /** What the Kompanion did in one app. Only used from the executor thread. */
    private static final class AppDemand {
        // features the Kompanion turned on (and so turns off)
        final Set<String> owned = new HashSet<>();
        // features being turned on, or found on or unavailable: nothing more to do while clients want them
        final Set<String> handled = new HashSet<>();
        final Map<String, ScheduledFuture<?>> releases = new HashMap<>();
        // breakpoint -> the subscriptions that own it
        final Map<String, Set<String>> breakpoints = new HashMap<>();
    }

    private final Map<String, AppDemand> apps = new HashMap<>();
    ScheduledExecutorService executor;

    void onStart(@Observes StartupEvent event) {
        start();
    }

    void onStop(@Observes ShutdownEvent event) {
        if (executor != null) {
            executor.shutdownNow();
        }
    }

    /** Starts listening to the subscriptions (also used by the tests, outside CDI). */
    void start() {
        executor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "kompanion-demand");
            t.setDaemon(true);
            return t;
        });
        eventBus.onSubscriptionsChanged(executionId -> run(() -> update(executionId)));
    }

    /**
     * Records the outcome of a connector action sent by a client: a breakpoint it added is owned by its subscription
     * (and removed at once if the subscription is gone already), one it removed is not anybody's any more. A breakpoint
     * added without a subscription is the user's, and never removed.
     */
    public void actionDone(String executionId, String subscriptionId, JsonNode action, boolean success) {
        if (subscriptionId == null
                || !success
                || !"debug".equals(action.path("action").asText())) {
            return;
        }
        String command = action.path("command").asText();
        String breakpoint = action.path("breakpoint").asText("");
        if (breakpoint.isBlank() || !(command.equals("add") || command.equals("remove"))) {
            return;
        }
        run(() -> {
            AppDemand app = apps.computeIfAbsent(executionId, id -> new AppDemand());
            if (command.equals("add")) {
                app.breakpoints
                        .computeIfAbsent(breakpoint, b -> new HashSet<>())
                        .add(subscriptionId);
                // the client may be gone already: then its breakpoint goes right away
                update(executionId);
            } else {
                app.breakpoints.remove(breakpoint);
            }
        });
    }

    /** Runs a task on the executor, logging its failure (the executor would swallow it). */
    private void run(Runnable task) {
        executor.execute(() -> {
            try {
                task.run();
            } catch (RuntimeException e) {
                LOG.warnf(e, "On-demand task failed: %s", e.getMessage());
            }
        });
    }

    /** Brings the app in line with what its clients ask for. Runs on the executor. */
    private void update(String executionId) {
        if (!registry.isConnected(executionId)) {
            // the app is gone, and with it what the Kompanion turned on
            AppDemand gone = apps.remove(executionId);
            if (gone != null) {
                gone.releases.values().forEach(f -> f.cancel(false));
            }
            return;
        }
        Map<String, ExecutionEventBus.Filter> filters = eventBus.filters(executionId);
        Set<String> wanted = new HashSet<>();
        filters.values().forEach(f -> wanted.addAll(f.ensure()));
        AppDemand app = apps.computeIfAbsent(executionId, id -> new AppDemand());
        for (String feature : FEATURES) {
            if (wanted.contains(feature)) {
                ScheduledFuture<?> release = app.releases.remove(feature);
                if (release != null) {
                    release.cancel(false);
                }
                if (app.handled.add(feature)) {
                    acquire(executionId, app, feature, stateAttempts);
                }
            } else {
                app.handled.remove(feature);
                if (app.owned.contains(feature) && !app.releases.containsKey(feature)) {
                    app.releases.put(
                            feature,
                            executor.schedule(
                                    () -> release(executionId, app, feature),
                                    releaseDelay.toMillis(),
                                    TimeUnit.MILLISECONDS));
                }
            }
        }
        for (var it = app.breakpoints.entrySet().iterator(); it.hasNext(); ) {
            var e = it.next();
            e.getValue().retainAll(filters.keySet());
            if (e.getValue().isEmpty()) {
                it.remove();
                send(executionId, debug("remove").put("breakpoint", e.getKey()), ok -> {});
            }
        }
    }

    private void acquire(String executionId, AppDemand app, String feature, int attempts) {
        if (!app.handled.contains(feature) || app.owned.contains(feature)) {
            return;
        }
        JsonNode state = state(executionId, feature);
        if (state == null) {
            if (attempts > 1) {
                executor.schedule(
                        () -> acquire(executionId, app, feature, attempts - 1), stateRetryMs, TimeUnit.MILLISECONDS);
            } else {
                unavailable(executionId, feature, "the app reports no " + feature + " state");
            }
            return;
        }
        if (state.path("enabled").asBoolean(false)) {
            // on already: the user's, left alone
            return;
        }
        if (!state.path("standby").asBoolean(false)) {
            unavailable(
                    executionId,
                    feature,
                    "the app did not start with camel." + feature + ".standby (or camel." + feature + ".enabled)");
            return;
        }
        ObjectNode on = "trace".equals(feature)
                ? mapper.createObjectNode().put("action", "trace").put("enabled", "true")
                : debug("enable");
        send(executionId, on, ok -> {
            if (ok && app.handled.contains(feature)) {
                app.owned.add(feature);
            } else if (ok) {
                // nobody wants it any more: turned on for nothing
                app.owned.add(feature);
                release(executionId, app, feature);
            } else {
                app.handled.remove(feature);
            }
        });
    }

    private void release(String executionId, AppDemand app, String feature) {
        app.releases.remove(feature);
        if (!app.owned.remove(feature) || !registry.isConnected(executionId)) {
            return;
        }
        ObjectNode off = "trace".equals(feature)
                ? mapper.createObjectNode().put("action", "trace").put("enabled", "false")
                : debug("disable");
        send(executionId, off, ok -> {});
    }

    /** The current state of a feature: the trace of the status, or the debug snapshot. */
    private JsonNode state(String executionId, String feature) {
        String json = "trace".equals(feature)
                ? eventBus.latestState(executionId, "connector.status")
                : eventBus.latestState(executionId, "connector.debug");
        if (json == null) {
            return null;
        }
        try {
            JsonNode data = mapper.readTree(json).path("data");
            JsonNode state = "trace".equals(feature) ? data.path("trace") : data;
            return state.isObject() && state.has("enabled") ? state : null;
        } catch (Exception e) {
            return null;
        }
    }

    private void unavailable(String executionId, String feature, String reason) {
        LOG.infof("Cannot turn %s on for execution=%s: %s", feature, executionId, reason);
        ObjectNode event = mapper.createObjectNode();
        event.put("type", "kompanion.unavailable");
        event.put("executionId", executionId);
        event.put("feature", feature);
        event.put("reason", reason);
        eventBus.publish(executionId, ExecutionEventBus.Tag.of("lifecycle"), event.toString());
    }

    private ObjectNode debug(String command) {
        return mapper.createObjectNode().put("action", "debug").put("command", command);
    }

    /** Sends a connector action to the app; the outcome is handled on the executor. */
    private void send(String executionId, ObjectNode action, java.util.function.Consumer<Boolean> outcome) {
        WorkerProtocol protocol = registry.protocol(executionId).getNow(null);
        if (protocol == null || protocol == WorkerProtocol.BRIDGE) {
            outcome.accept(false);
            return;
        }
        String correlationId = "kompanion-demand-" + UUID.randomUUID();
        try {
            String frame = ConnectorProtocolCodec.encode(
                    mapper, new KompanionCommand.CmdConnectorAction(action), correlationId);
            registry.sendCommand(executionId, correlationId, frame).whenComplete((ack, failure) -> {
                // nobody polls it
                registry.forget(executionId, correlationId);
                boolean ok = failure == null && ack.success();
                if (!ok) {
                    LOG.warnf(
                            "Connector action %s failed for execution=%s: %s",
                            action, executionId, failure != null ? failure.getMessage() : ack.detail());
                }
                run(() -> outcome.accept(ok));
            });
        } catch (Exception e) {
            LOG.warnf("Cannot send %s to execution=%s: %s", action, executionId, e.getMessage());
            outcome.accept(false);
        }
    }
}
