package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Cuts the connector snapshots per route for the clients that filter (the sliced view of {@link ExecutionEventBus}), so
 * a client gets only the routes it wants, and a state only when it changed:
 *
 * <ul>
 *   <li>status: one state for the context (the status without its routes, {@code routeId} absent) and one per route
 *       ({@code routeId} set, {@code data} the route); a route that is gone gets {@code "removed":true};
 *   <li>trace and receive: their messages split per route ({@code routeId} of each message), into one event per route;
 *       messages of no route go into an event of no route;
 *   <li>the other kinds (debug, history, error, activity): one state, whole.
 * </ul>
 *
 * Sliced frames keep the connector's envelope ({@code camel.connector.snapshot} with its {@code kind}), plus
 * {@code routeId}. A state is only published when it changed, ignoring the fields of
 * {@code kaoto.kompanion.events.slice-ignore-fields} (none by default), at any depth.
 */
@ApplicationScoped
public class SnapshotSlicer {

    @Inject
    ExecutionEventBus eventBus;

    @ConfigProperty(name = "kaoto.kompanion.events.slice-ignore-fields")
    Optional<List<String>> ignoreFields = Optional.empty();

    private final ObjectMapper mapper = new ObjectMapper();

    private record Published(Set<String> routes, Map<String, JsonNode> compared) {}

    // executionId -> what was published last
    final Map<String, Published> published = new ConcurrentHashMap<>();

    void onStart(@Observes StartupEvent event) {
        start();
    }

    /** Forgets an execution once its log ended (also used by the tests, outside CDI). */
    void start() {
        // a file transport app does not come back under the same id (pid-<pid>): what it published would stay forever
        eventBus.onSubscriptionsChanged(executionId -> {
            if (!eventBus.isOpen(executionId)) {
                published.remove(executionId);
            }
        });
    }

    /** Forgets what was published for the execution (its worker said hello: a new connection). */
    public void reset(String executionId) {
        published.remove(executionId);
    }

    /** Publishes the slices of a connector snapshot ({@code kind} and {@code data} of the frame). */
    public void slice(String executionId, String kind, JsonNode data) throws Exception {
        if (!data.isObject()) {
            return;
        }
        Published last = published.computeIfAbsent(
                executionId, id -> new Published(ConcurrentHashMap.newKeySet(), new ConcurrentHashMap<>()));
        switch (kind) {
            case "status" -> status(executionId, last, (ObjectNode) data);
            case "trace" -> messages(executionId, kind, (ObjectNode) data, "traces");
            case "receive" -> messages(executionId, kind, (ObjectNode) data, "messages");
            default -> state(executionId, last, kind, kind, null, data);
        }
    }

    private void status(String executionId, Published last, ObjectNode status) throws Exception {
        ObjectNode context = status.deepCopy();
        context.remove("routes");
        state(executionId, last, "status", "status", null, context);
        Set<String> seen = new HashSet<>();
        for (JsonNode route : status.path("routes")) {
            String routeId = route.path("routeId").asText(null);
            if (routeId != null) {
                seen.add(routeId);
                state(executionId, last, "status:" + routeId, "status", routeId, route);
            }
        }
        for (String gone : Set.copyOf(last.routes())) {
            if (!seen.contains(gone)) {
                ObjectNode frame = frame(executionId, "status", gone);
                frame.put("removed", true);
                last.compared().remove("status:" + gone);
                eventBus.publishState(
                        executionId,
                        "status:" + gone,
                        ExecutionEventBus.Tag.sliced("status", gone),
                        mapper.writeValueAsString(frame));
            }
        }
        last.routes().clear();
        last.routes().addAll(seen);
    }

    private void messages(String executionId, String kind, ObjectNode data, String key) throws Exception {
        // route -> its messages, in their order
        Map<String, ArrayNode> perRoute = new LinkedHashMap<>();
        for (JsonNode m : data.path(key)) {
            String routeId = m.path("routeId").asText("");
            perRoute.computeIfAbsent(routeId, r -> mapper.createArrayNode()).add(m);
        }
        for (Map.Entry<String, ArrayNode> e : perRoute.entrySet()) {
            String routeId = e.getKey().isEmpty() ? null : e.getKey();
            ObjectNode slice = data.deepCopy();
            slice.set(key, e.getValue());
            ObjectNode frame = frame(executionId, kind, routeId);
            frame.set("data", slice);
            eventBus.publish(
                    executionId, ExecutionEventBus.Tag.sliced(kind, routeId), mapper.writeValueAsString(frame));
        }
    }

    private void state(String executionId, Published last, String key, String kind, String routeId, JsonNode data)
            throws Exception {
        JsonNode compared = withoutIgnored(data);
        if (compared.equals(last.compared().get(key))) {
            return;
        }
        last.compared().put(key, compared);
        ObjectNode frame = frame(executionId, kind, routeId);
        frame.set("data", data);
        eventBus.publishState(
                executionId, key, ExecutionEventBus.Tag.sliced(kind, routeId), mapper.writeValueAsString(frame));
    }

    private ObjectNode frame(String executionId, String kind, String routeId) {
        ObjectNode frame = mapper.createObjectNode();
        frame.put("type", "camel.connector.snapshot");
        frame.put("kind", kind);
        frame.put("executionId", executionId);
        if (routeId != null) {
            frame.put("routeId", routeId);
        }
        return frame;
    }

    /** The node without the ignored fields, at any depth (the node itself when there are none). */
    private JsonNode withoutIgnored(JsonNode node) {
        List<String> ignored = ignoreFields.orElse(List.of());
        if (ignored.isEmpty()) {
            return node;
        }
        JsonNode copy = node.deepCopy();
        strip(copy, ignored);
        return copy;
    }

    private static void strip(JsonNode node, List<String> ignored) {
        if (node.isObject()) {
            ((ObjectNode) node).remove(ignored);
        }
        node.forEach(child -> strip(child, ignored));
    }
}
