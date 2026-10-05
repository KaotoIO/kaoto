package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.kompanion.worker.ExecutionEventBus.Filter;
import io.kaoto.kompanion.worker.ExecutionEventBus.Tag;
import io.smallrye.mutiny.helpers.test.AssertSubscriber;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ExecutionEventBusTest {

    private static ExecutionEventBus bus() {
        var bus = new ExecutionEventBus();
        bus.bufferSize = 16;
        return bus;
    }

    @Test
    void streamForReturnsNullForUnknownExecution() {
        assertNull(bus().streamFor("nope"));
    }

    @Test
    void framesArrivingWithoutDemandAreBufferedPerSubscriber() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        bus.publish("exec-1", "a");
        bus.publish("exec-1", "b");
        bus.publish("exec-1", "c");
        subscriber.request(10);

        subscriber.assertItems("a", "b", "c").assertNotTerminated();
    }

    @Test
    void stalledSubscriberOnlyReceivesTheLatestValueOfAState() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        bus.publish("exec-1", "result");
        for (int i = 1; i <= 100; i++) {
            bus.publishState("exec-1", "status", "status-" + i);
        }
        subscriber.request(200);

        subscriber.assertItems("result", "status-100").assertNotTerminated();
    }

    @Test
    void subscriberBehindTheRingGetsAGapThenGoesOn() {
        var bus = bus();
        bus.bufferSize = 4;
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        for (int i = 1; i <= 10; i++) {
            bus.publish("exec-1", "e" + i);
        }
        subscriber.request(100);

        subscriber.assertItems(
                "{\"type\":\"kompanion.gap\",\"executionId\":\"exec-1\",\"from\":1,\"to\":6}", "e7", "e8", "e9", "e10");
        // and it is not failed: it keeps receiving
        bus.publish("exec-1", "e11");
        assertEquals("e11", subscriber.getItems().get(5));
        subscriber.assertNotTerminated();
    }

    @Test
    void ringIsAlsoBoundedInBytes() {
        var bus = bus();
        bus.bufferBytes = 10;
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        bus.publish("exec-1", "aaaaaa");
        bus.publish("exec-1", "bbbbbb");
        subscriber.request(10);

        assertTrue(
                subscriber.getItems().get(0).contains("kompanion.gap"),
                subscriber.getItems().toString());
        assertEquals("bbbbbb", subscriber.getItems().get(1));
    }

    @Test
    void closeDeliversWhatIsLeftBeforeCompleting() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));
        bus.publish("exec-1", "last");
        bus.close("exec-1", "conn-1");
        subscriber.assertNotTerminated();

        subscriber.request(10);
        subscriber.assertItems("last").assertCompleted();
    }

    @Test
    void readyFrameIsReplayedToLateSubscribers() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        bus.publishReady("exec-1", "ready");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(10));

        bus.publish("exec-1", "event");
        bus.close("exec-1", "conn-1");

        subscriber.assertItems("ready", "event").assertCompleted();
    }

    @Test
    void closeOnlyActsForTheOwningConnection() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(10));

        bus.close("exec-1", "conn-2");
        subscriber.assertNotTerminated();
        bus.close("exec-1", "conn-1");
        subscriber.assertCompleted();
    }

    @Test
    void reconnectingWorkerTakesOverTheStream() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        bus.publishReady("exec-1", "ready-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(10));

        bus.open("exec-1", "conn-2");
        bus.close("exec-1", "conn-1");
        subscriber.assertNotTerminated();
        bus.publish("exec-1", "from-conn-2");
        subscriber.assertItems("ready-1", "from-conn-2");

        // the old ready frame is not replayed to new subscribers: the new connection says hello again
        AssertSubscriber<String> late = bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(10));
        bus.publishReady("exec-1", "ready-2");
        late.assertItems("ready-2");

        bus.close("exec-1", "conn-2");
        subscriber.assertCompleted();
    }

    @Test
    void clientWithoutFilterGetsTheRawViewOnly() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> client =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(10));

        bus.publishState("exec-1", "connector.status", Tag.raw("status"), "raw-status");
        bus.publishState("exec-1", "status:orders", Tag.sliced("status", "orders"), "orders-status");
        bus.publish("exec-1", Tag.of("result"), "result");

        client.assertItems("raw-status", "result");
    }

    @Test
    void filteredClientGetsItsKindsAndRoutesOfTheSlicedView() throws Exception {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        bus.publishReady("exec-1", "ready");
        var client = subscribe(bus, new Filter(Set.of("status"), Set.of("orders")));

        bus.publishState("exec-1", "connector.status", Tag.raw("status"), "raw-status");
        bus.publishState("exec-1", "status:orders", Tag.sliced("status", "orders"), "orders-status");
        bus.publishState("exec-1", "status:control", Tag.sliced("status", "control"), "control-status");
        bus.publishState("exec-1", "status", Tag.sliced("status", null), "context-status");
        bus.publish("exec-1", Tag.sliced("trace", "orders"), "orders-trace");
        bus.publish("exec-1", Tag.of("result"), "result");

        List<String> items = client.getItems();
        assertEquals(
                "kompanion.subscribed",
                new ObjectMapper().readTree(items.get(0)).path("type").asText());
        // results and ready whatever the filter, entries about no route with its kinds
        assertEquals(List.of("ready", "orders-status", "context-status", "result"), items.subList(1, items.size()));
    }

    @Test
    void changedFilterGetsTheCurrentStateOfItsNewRoutes() throws Exception {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        bus.publishState("exec-1", "status:orders", Tag.sliced("status", "orders"), "orders-1");
        bus.publishState("exec-1", "status:control", Tag.sliced("status", "control"), "control-1");
        var client = subscribe(bus, new Filter(Set.of("status"), Set.of("orders")));
        String id = new ObjectMapper()
                .readTree(client.getItems().get(0))
                .path("subscriptionId")
                .asText();
        assertEquals(
                List.of("orders-1"),
                client.getItems().subList(1, client.getItems().size()));

        assertTrue(bus.updateFilter("exec-1", id, new Filter(Set.of("status"), Set.of("control"))));
        bus.publishState("exec-1", "status:orders", Tag.sliced("status", "orders"), "orders-2");
        bus.publishState("exec-1", "status:control", Tag.sliced("status", "control"), "control-2");

        assertEquals(
                List.of("orders-1", "control-1", "control-2"),
                client.getItems().subList(1, client.getItems().size()));
        assertEquals(Set.of(id), bus.filters("exec-1").keySet());
        assertFalse(bus.updateFilter("exec-1", "no-such-subscription", new Filter(null, null)));
    }

    private static AssertSubscriber<String> subscribe(ExecutionEventBus bus, Filter filter) {
        return bus.eventsFor("exec-1", null, filter)
                .map(ExecutionEventBus.LogEvent::json)
                .subscribe()
                .withSubscriber(AssertSubscriber.create(100));
    }
}
