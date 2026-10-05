package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.kompanion.worker.ExecutionEventBus.Filter;
import io.smallrye.mutiny.helpers.test.AssertSubscriber;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ConnectorDemandTest {

    private static final String EXEC = "exec-1";

    private final ObjectMapper mapper = new ObjectMapper();
    private final ExecutionEventBus bus = new ExecutionEventBus();
    private final WorkerRegistry registry = new WorkerRegistry();
    private final ConnectorDemand demand = new ConnectorDemand();
    // the actions the app got
    private final List<JsonNode> actions = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        demand.eventBus = bus;
        demand.registry = registry;
        demand.stateRetryMs = 20;
        demand.start();
        bus.open(EXEC, "conn-1");
        // a connector that runs every action
        registry.register(EXEC, "conn-1", frame -> {
            try {
                JsonNode node = mapper.readTree(frame);
                actions.add(node.path("action"));
                registry.receiveAck(EXEC, node.path("requestId").asText(), true, "ok");
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
        });
        registry.protocolDetected(EXEC, "conn-1", WorkerProtocol.CONNECTOR);
    }

    @AfterEach
    void tearDown() {
        demand.executor.shutdownNow();
    }

    @Test
    void traceIsOnWhileAClientAsksForIt() throws Exception {
        trace(false, true);
        var first = subscribe(Set.of("trace"));
        await(() -> actions.size() >= 1, "trace turned on");
        assertEquals(
                "{\"action\":\"trace\",\"enabled\":\"true\"}", actions.get(0).toString());

        var second = subscribe(Set.of("trace"));
        first.cancel();
        Thread.sleep(100);
        assertEquals(1, actions.size(), "still wanted: " + actions);

        second.cancel();
        await(() -> actions.size() >= 2, "trace turned off");
        assertEquals(
                "{\"action\":\"trace\",\"enabled\":\"false\"}", actions.get(1).toString());
    }

    @Test
    void traceTheUserTurnedOnIsLeftAlone() throws Exception {
        trace(true, true);
        var client = subscribe(Set.of("trace"));
        Thread.sleep(100);
        client.cancel();
        Thread.sleep(100);
        assertTrue(actions.isEmpty(), actions::toString);
    }

    @Test
    void traceWithoutTheTracerIsReportedUnavailable() throws Exception {
        trace(false, false);
        var client = subscribe(Set.of("trace"));
        await(() -> client.getItems().stream().anyMatch(i -> i.contains("kompanion.unavailable")), "unavailable");
        assertTrue(actions.isEmpty(), actions::toString);
        String event = client.getItems().stream()
                .filter(i -> i.contains("kompanion.unavailable"))
                .findFirst()
                .orElseThrow();
        assertTrue(event.contains("camel.trace.standby"), event);
    }

    @Test
    void featureWithoutStateIsReportedUnavailableAfterRetrying() throws Exception {
        var client = subscribe(Set.of("debug"));
        await(() -> client.getItems().stream().anyMatch(i -> i.contains("kompanion.unavailable")), "unavailable");
        assertTrue(actions.isEmpty(), actions::toString);
    }

    @Test
    void clientsThatDoNotAskChangeNothing() throws Exception {
        trace(false, true);
        var client = subscribe(Set.of());
        Thread.sleep(100);
        client.cancel();
        bus.streamFor(EXEC)
                .subscribe()
                .withSubscriber(AssertSubscriber.create(10))
                .cancel();
        Thread.sleep(100);
        assertTrue(actions.isEmpty(), actions::toString);
    }

    @Test
    void debugIsEnabledWhileAClientAsksForIt() throws Exception {
        bus.publishState(
                EXEC,
                "connector.debug",
                ExecutionEventBus.Tag.raw("debug"),
                "{\"data\":{\"enabled\":false,\"standby\":true}}");
        var client = subscribe(Set.of("debug"));
        await(() -> actions.size() >= 1, "debugger enabled");
        assertEquals(
                "{\"action\":\"debug\",\"command\":\"enable\"}", actions.get(0).toString());
        client.cancel();
        await(() -> actions.size() >= 2, "debugger disabled");
        assertEquals(
                "{\"action\":\"debug\",\"command\":\"disable\"}", actions.get(1).toString());
    }

    @Test
    void breakpointsAreRemovedByIdOnceNoOwnerIsLeft() throws Exception {
        var first = subscribe(Set.of());
        var second = subscribe(Set.of());
        String firstId = subscriptionId(first);
        String secondId = subscriptionId(second);
        demand.actionDone(EXEC, firstId, breakpoint("add", "log-order"), true);
        demand.actionDone(EXEC, secondId, breakpoint("add", "log-order"), true);
        demand.actionDone(EXEC, firstId, breakpoint("add", "reply"), true);
        // failed: not added
        demand.actionDone(EXEC, firstId, breakpoint("add", "boom"), false);
        processed();

        first.cancel();
        await(() -> actions.size() >= 1, "breakpoint of the first client removed");
        assertEquals(1, actions.size(), actions::toString);
        assertEquals(
                "{\"action\":\"debug\",\"command\":\"remove\",\"breakpoint\":\"reply\"}",
                actions.get(0).toString());

        second.cancel();
        await(() -> actions.size() >= 2, "shared breakpoint removed");
        assertEquals(
                "{\"action\":\"debug\",\"command\":\"remove\",\"breakpoint\":\"log-order\"}",
                actions.get(1).toString());
        Thread.sleep(100);
        assertEquals(2, actions.size(), actions::toString);
    }

    @Test
    void breakpointRemovedByAClientIsNotRemovedAgain() throws Exception {
        var client = subscribe(Set.of());
        String id = subscriptionId(client);
        demand.actionDone(EXEC, id, breakpoint("add", "log-order"), true);
        demand.actionDone(EXEC, id, breakpoint("remove", "log-order"), true);
        processed();
        client.cancel();
        Thread.sleep(100);
        assertTrue(actions.isEmpty(), actions::toString);
    }

    @Test
    void releaseWaitsForTheDelaySoAClientComingBackKeepsTheFeature() throws Exception {
        demand.releaseDelay = Duration.ofMillis(300);
        trace(false, true);
        var client = subscribe(Set.of("trace"));
        await(() -> actions.size() >= 1, "trace turned on");

        client.cancel();
        Thread.sleep(50);
        var back = subscribe(Set.of("trace"));
        Thread.sleep(400);
        assertEquals(1, actions.size(), actions::toString);

        back.cancel();
        await(() -> actions.size() >= 2, "trace turned off after the delay");
    }

    /** Waits until the demand handled what it was told so far (it works on its own thread). */
    private void processed() throws Exception {
        demand.executor.submit(() -> {}).get();
    }

    private void trace(boolean enabled, boolean standby) {
        bus.publishState(
                EXEC,
                "connector.status",
                ExecutionEventBus.Tag.raw("status"),
                "{\"data\":{\"trace\":{\"enabled\":" + enabled + ",\"standby\":" + standby + "}}}");
    }

    private AssertSubscriber<String> subscribe(Set<String> ensure) {
        return bus.eventsFor(EXEC, null, new Filter(Set.of("status"), null, ensure))
                .map(ExecutionEventBus.LogEvent::json)
                .subscribe()
                .withSubscriber(AssertSubscriber.create(100));
    }

    private String subscriptionId(AssertSubscriber<String> client) throws Exception {
        return mapper.readTree(client.getItems().get(0)).path("subscriptionId").asText();
    }

    private JsonNode breakpoint(String command, String nodeId) {
        return mapper.createObjectNode()
                .put("action", "debug")
                .put("command", command)
                .put("breakpoint", nodeId);
    }

    private static void await(BooleanSupplier condition, String what) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 3000;
        while (!condition.getAsBoolean()) {
            if (System.currentTimeMillis() > deadline) {
                fail("timed out waiting for " + what);
            }
            Thread.sleep(10);
        }
    }

    @Test
    void breakpointOfAClientAlreadyGoneIsRemovedAtOnce() throws Exception {
        var client = subscribe(Set.of());
        String id = subscriptionId(client);
        client.cancel();
        // the command was answered after the client left
        demand.actionDone(EXEC, id, breakpoint("add", "log-order"), true);
        await(() -> actions.size() >= 1, "breakpoint removed");
        assertEquals(
                "{\"action\":\"debug\",\"command\":\"remove\",\"breakpoint\":\"log-order\"}",
                actions.get(0).toString());
    }

    @Test
    void breakpointOfTheUserIsNeverRemoved() throws Exception {
        var client = subscribe(Set.of());
        // no subscription: a breakpoint the user added (camel CLI, a client without a subscription)
        demand.actionDone(EXEC, null, breakpoint("add", "log-order"), true);
        processed();
        client.cancel();
        Thread.sleep(100);
        assertTrue(actions.isEmpty(), actions::toString);
    }
}
