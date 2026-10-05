package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.kompanion.worker.ExecutionEventBus.Filter;
import io.smallrye.mutiny.helpers.test.AssertSubscriber;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SnapshotSlicerTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final ExecutionEventBus bus = new ExecutionEventBus();
    private final SnapshotSlicer slicer = new SnapshotSlicer();

    @BeforeEach
    void setUp() {
        slicer.eventBus = bus;
        bus.open("exec-1", "conn-1");
    }

    @Test
    void statusIsCutIntoTheContextAndOneStatePerRoute() throws Exception {
        var orders = subscribe(Set.of("status"), Set.of("orders"));
        slicer.slice("exec-1", "status", status("Started", 1, "Started", 1));

        List<JsonNode> frames = frames(orders);
        assertEquals(2, frames.size(), frames::toString);
        // the context, without the routes
        assertFalse(frames.get(0).has("routeId"));
        assertEquals(
                "app", frames.get(0).path("data").path("context").path("name").asText());
        assertTrue(frames.get(0).path("data").path("routes").isMissingNode());
        // the route
        assertEquals("orders", frames.get(1).path("routeId").asText());
        assertEquals("status", frames.get(1).path("kind").asText());
        assertEquals("camel.connector.snapshot", frames.get(1).path("type").asText());
        assertEquals(
                1,
                frames.get(1)
                        .path("data")
                        .path("statistics")
                        .path("exchangesTotal")
                        .asInt());
    }

    @Test
    void routeIsOnlySentWhenItChanged() throws Exception {
        var orders = subscribe(Set.of("status"), Set.of("orders"));
        slicer.slice("exec-1", "status", status("Started", 1, "Started", 1));
        // control changed, orders did not
        slicer.slice("exec-1", "status", status("Started", 1, "Stopped", 1));
        slicer.slice("exec-1", "status", status("Started", 2, "Stopped", 1));

        List<Integer> totals = frames(orders).stream()
                .filter(f -> "orders".equals(f.path("routeId").asText()))
                .map(f ->
                        f.path("data").path("statistics").path("exchangesTotal").asInt())
                .toList();
        assertEquals(List.of(1, 2), totals);
    }

    @Test
    void ignoredFieldsDoNotCountAsAChange() throws Exception {
        slicer.ignoreFields = Optional.of(List.of("uptime"));
        var orders = subscribe(Set.of("status"), Set.of("orders"));
        var first = status("Started", 1, "Started", 1);
        var second = status("Started", 1, "Started", 1);
        ((com.fasterxml.jackson.databind.node.ObjectNode) second.path("routes").get(0)).put("uptime", "2s");
        slicer.slice("exec-1", "status", first);
        slicer.slice("exec-1", "status", second);

        assertEquals(1, frames(orders).stream().filter(f -> f.has("routeId")).count());
    }

    @Test
    void routeThatIsGoneIsSentAsRemoved() throws Exception {
        var control = subscribe(Set.of("status"), Set.of("control"));
        slicer.slice("exec-1", "status", status("Started", 1, "Started", 1));
        var withoutControl = status("Started", 1, "Started", 1);
        ((com.fasterxml.jackson.databind.node.ArrayNode) withoutControl.path("routes")).remove(1);
        slicer.slice("exec-1", "status", withoutControl);

        JsonNode last = frames(control).getLast();
        assertEquals("control", last.path("routeId").asText());
        assertTrue(last.path("removed").asBoolean(), last.toString());
    }

    @Test
    void traceIsCutPerRoute() throws Exception {
        var orders = subscribe(Set.of("trace"), Set.of("orders"));
        slicer.slice(
                "exec-1",
                "trace",
                mapper.readTree("{\"enabled\":true,\"traces\":[{\"uid\":1,\"routeId\":\"orders\"},"
                        + "{\"uid\":2,\"routeId\":\"control\"},{\"uid\":3,\"routeId\":\"orders\"}]}"));

        List<JsonNode> frames = frames(orders);
        assertEquals(1, frames.size(), frames::toString);
        assertEquals("orders", frames.get(0).path("routeId").asText());
        assertEquals(2, frames.get(0).path("data").path("traces").size());
        assertEquals(
                3, frames.get(0).path("data").path("traces").path(1).path("uid").asInt());
        assertTrue(frames.get(0).path("data").path("enabled").asBoolean());
    }

    @Test
    void otherKindsArePassedWhole() throws Exception {
        var debug = subscribe(Set.of("debug"), Set.of("orders"));
        slicer.slice("exec-1", "debug", mapper.readTree("{\"enabled\":true,\"suspended\":[]}"));
        slicer.slice("exec-1", "debug", mapper.readTree("{\"enabled\":true,\"suspended\":[]}"));

        List<JsonNode> frames = frames(debug);
        assertEquals(1, frames.size(), frames::toString);
        assertTrue(frames.get(0).path("data").path("enabled").asBoolean());
    }

    private AssertSubscriber<String> subscribe(Set<String> kinds, Set<String> routes) {
        return bus.eventsFor("exec-1", null, new Filter(kinds, routes))
                .map(ExecutionEventBus.LogEvent::json)
                .subscribe()
                .withSubscriber(AssertSubscriber.create(100));
    }

    /** The frames received, without the subscribed event. */
    private List<JsonNode> frames(AssertSubscriber<String> client) {
        return client.getItems().stream()
                .skip(1)
                .map(json -> {
                    try {
                        return mapper.readTree(json);
                    } catch (Exception e) {
                        throw new IllegalStateException(e);
                    }
                })
                .toList();
    }

    private JsonNode status(String ordersState, int ordersTotal, String controlState, int controlTotal)
            throws Exception {
        return mapper.readTree("{\"context\":{\"name\":\"app\",\"version\":\"4.22.1\",\"state\":\"Started\"},"
                + "\"routes\":[" + route("orders", ordersState, ordersTotal) + ","
                + route("control", controlState, controlTotal) + "]}");
    }

    private static String route(String id, String state, int total) {
        return "{\"routeId\":\"" + id + "\",\"state\":\"" + state + "\",\"uptime\":\"1s\",\"statistics\":"
                + "{\"exchangesTotal\":" + total + "},\"processors\":[{\"id\":\"log-" + id + "\"}]}";
    }

    @Test
    void stateOfAnExecutionIsForgottenWhenItEnds() throws Exception {
        slicer.start();
        slicer.slice("exec-1", "status", status("Started", 1, "Started", 1));
        assertTrue(slicer.published.containsKey("exec-1"));

        // an app of the file transport that stops does not come back with the same id: pid-<pid>
        bus.close("exec-1", "conn-1");
        assertFalse(slicer.published.containsKey("exec-1"));
    }
}
