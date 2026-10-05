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
}
