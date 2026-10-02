package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import io.smallrye.mutiny.helpers.test.AssertSubscriber;
import java.util.List;
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
    void stalledSubscriberOnlyReceivesTheLatestSnapshot() {
        var bus = bus();
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> subscriber =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        bus.publish("exec-1", "result");
        for (int i = 1; i <= 100; i++) {
            bus.publishSnapshot("exec-1", "snapshot-" + i);
        }
        subscriber.request(200);

        List<String> items = subscriber.getItems();
        assertTrue(items.contains("result"), items.toString());
        assertTrue(items.contains("snapshot-100"), "the latest snapshot is delivered: " + items);
        // the merge holds the one snapshot it prefetched, every other superseded snapshot is dropped
        long snapshots =
                items.stream().filter(item -> item.startsWith("snapshot-")).count();
        assertTrue(snapshots <= 2, "a stalled subscriber retains at most two snapshots: " + items);
        subscriber.assertNotTerminated();
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
}
