package io.kaoto.kompanion.worker;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.MultiEmitter;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * The events of every execution, for the SSE clients. Each execution has a log of two parts:
 *
 * <ul>
 *   <li>events (command results, lifecycle, trace and receive messages): a ring numbered by a sequence, bounded by
 *       {@code kaoto.kompanion.events.buffer} entries and {@code kaoto.kompanion.events.buffer-bytes};
 *   <li>states (worker ready, status, debug, history, ...): only the latest value of each key is kept.
 * </ul>
 *
 * Every client reads from its own position, at its own pace: it gets every event in order and the latest value of every
 * state that changed since it last got it, so a slow client never loses an event to a newer state (a trace to the next
 * status), and nothing is buffered per client. A client so slow that the ring dropped events it had not read gets a
 * {@code kompanion.gap} event saying which ones, and goes on. A client that reconnects with the sequence of the last
 * event it got goes on from there.
 */
@ApplicationScoped
public class ExecutionEventBus {

    private static final Logger LOG = Logger.getLogger(ExecutionEventBus.class);

    /** The state key of the worker-ready frame, replayed to every client. */
    public static final String READY = "ready";

    /** An event of the log: its sequence (the SSE event id) and its JSON. */
    public record LogEvent(long seq, String json) {}

    private record Entry(long seq, String key, String json, int bytes) {}

    @ConfigProperty(name = "kaoto.kompanion.events.buffer", defaultValue = "4096")
    int bufferSize = 4096;

    @ConfigProperty(name = "kaoto.kompanion.events.buffer-bytes", defaultValue = "33554432")
    long bufferBytes = 32L * 1024 * 1024;

    private final Map<String, ExecutionLog> logs = new ConcurrentHashMap<>();

    /** Returns the event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        Multi<LogEvent> events = eventsFor(executionId, null);
        return events == null ? null : events.map(LogEvent::json);
    }

    /**
     * Returns the events of the given executionId with their sequence, or null if none exists. Without
     * {@code lastEventId} the client gets the current states and the events from now on; with it, also the events after
     * that one still in the log (a gap event for the ones that are not).
     */
    public Multi<LogEvent> eventsFor(String executionId, Long lastEventId) {
        ExecutionLog log = logs.get(executionId);
        if (log == null) {
            return null;
        }
        return Multi.createFrom().emitter(emitter -> {
            var subscriber = log.subscribe(emitter, lastEventId);
            emitter.onRequest(n -> subscriber.drain());
            emitter.onTermination(() -> log.unsubscribe(subscriber));
            subscriber.drain();
        });
    }

    /**
     * Called by the worker transports when a worker connects, before any event arrives. When the worker of an existing
     * execution reconnects, the new connection takes over the log, so the clients keep receiving and the close of the
     * previous connection does not end it.
     */
    public void open(String executionId, String connectionId) {
        logs.compute(executionId, (id, existing) -> {
            if (existing == null) {
                return new ExecutionLog(executionId, connectionId);
            }
            if (!existing.connectionId.equals(connectionId)) {
                existing.connectionId = connectionId;
                // the new connection says hello again
                existing.removeState(READY);
            }
            return existing;
        });
        LOG.debugf("Event log opened for execution=%s connectionId=%s", executionId, connectionId);
    }

    /** Publishes an event: every client gets it, in order. */
    public void publish(String executionId, String jsonFrame) {
        ExecutionLog log = logs.get(executionId);
        if (log != null) {
            log.append(null, jsonFrame);
        }
    }

    /**
     * Publishes the new value of a state (status, debug, ...): a client that did not get the previous value yet only
     * gets this one.
     */
    public void publishState(String executionId, String key, String jsonFrame) {
        ExecutionLog log = logs.get(executionId);
        if (log != null) {
            log.append(key, jsonFrame);
        }
    }

    /** Publishes the worker-ready frame; it is also replayed to clients that subscribe later. */
    public void publishReady(String executionId, String jsonFrame) {
        publishState(executionId, READY, jsonFrame);
    }

    /**
     * Ends the log: the clients get what they did not read yet, then their stream completes. Only acts when the closing
     * connectionId still owns the log, so a reconnecting worker does not end the new one.
     */
    public void close(String executionId, String connectionId) {
        ExecutionLog log = logs.get(executionId);
        if (log == null || !log.connectionId.equals(connectionId)) {
            return;
        }
        logs.remove(executionId, log);
        log.close();
        LOG.debugf("Event log closed for execution=%s connectionId=%s", executionId, connectionId);
    }

    private final class ExecutionLog {
        private final String executionId;
        // the worker connection that owns the log; a reconnecting worker takes it over (see open)
        private volatile String connectionId;
        private final ConcurrentSkipListMap<Long, Entry> events = new ConcurrentSkipListMap<>();
        // key -> latest entry
        private final Map<String, Entry> states = new LinkedHashMap<>();
        private final Set<Subscriber> subscribers = ConcurrentHashMap.newKeySet();
        private long seq;
        private long eventBytes;
        // the events up to this sequence were dropped from the ring
        private long droppedUpTo;
        private volatile boolean closed;

        ExecutionLog(String executionId, String connectionId) {
            this.executionId = executionId;
            this.connectionId = connectionId;
        }

        void append(String key, String json) {
            synchronized (this) {
                if (closed) {
                    return;
                }
                Entry entry = new Entry(++seq, key, json, json.getBytes(StandardCharsets.UTF_8).length);
                if (key != null) {
                    states.put(key, entry);
                } else {
                    events.put(entry.seq(), entry);
                    eventBytes += entry.bytes();
                    // the latest event stays, even when it alone is over the bytes bound
                    while (events.size() > 1 && (events.size() > bufferSize || eventBytes > bufferBytes)) {
                        Entry dropped = events.pollFirstEntry().getValue();
                        eventBytes -= dropped.bytes();
                        droppedUpTo = dropped.seq();
                    }
                }
            }
            subscribers.forEach(Subscriber::drain);
        }

        synchronized void removeState(String key) {
            states.remove(key);
        }

        Subscriber subscribe(MultiEmitter<? super LogEvent> emitter, Long lastEventId) {
            Subscriber subscriber;
            synchronized (this) {
                // a new client starts from now; a client that comes back goes on after the last event it got
                subscriber = new Subscriber(this, emitter, lastEventId != null ? Math.min(lastEventId, seq) : seq);
            }
            subscribers.add(subscriber);
            return subscriber;
        }

        void unsubscribe(Subscriber subscriber) {
            subscribers.remove(subscriber);
        }

        void close() {
            synchronized (this) {
                closed = true;
            }
            subscribers.forEach(Subscriber::drain);
        }

        /** The next item for the subscriber, moving its position, or null when it read everything. */
        synchronized LogEvent next(Subscriber s) {
            if (s.eventCursor < droppedUpTo) {
                long from = s.eventCursor + 1;
                s.eventCursor = droppedUpTo;
                return new LogEvent(
                        droppedUpTo,
                        "{\"type\":\"kompanion.gap\",\"executionId\":\"" + executionId + "\",\"from\":" + from
                                + ",\"to\":" + droppedUpTo + "}");
            }
            Map.Entry<Long, Entry> event = events.higherEntry(s.eventCursor);
            Entry state = nextState(s);
            if (state != null && (event == null || state.seq() < event.getKey())) {
                s.delivered.put(state.key(), state.seq());
                return new LogEvent(state.seq(), state.json());
            }
            if (event != null) {
                s.eventCursor = event.getKey();
                return new LogEvent(event.getKey(), event.getValue().json());
            }
            return null;
        }

        /** Whether the subscriber read everything, without moving its position. */
        synchronized boolean caughtUp(Subscriber s) {
            return s.eventCursor >= droppedUpTo && events.higherEntry(s.eventCursor) == null && nextState(s) == null;
        }

        /** The oldest state value the subscriber did not get yet. */
        private Entry nextState(Subscriber s) {
            Entry next = null;
            for (Entry e : states.values()) {
                if (e.seq() > s.delivered.getOrDefault(e.key(), 0L) && (next == null || e.seq() < next.seq())) {
                    next = e;
                }
            }
            return next;
        }
    }

    /** A client of a log: its position, and the stream it reads at its own pace. */
    private static final class Subscriber {
        private final ExecutionLog log;
        private final MultiEmitter<? super LogEvent> emitter;
        private final AtomicInteger wip = new AtomicInteger();
        // the last event read, and the sequence of the last value read of every state
        private long eventCursor;
        private final Map<String, Long> delivered = new HashMap<>();

        Subscriber(ExecutionLog log, MultiEmitter<? super LogEvent> emitter, long eventCursor) {
            this.log = log;
            this.emitter = emitter;
            this.eventCursor = eventCursor;
        }

        /** Emits what the client asked for and the log has; one thread at a time, the others leave it more to do. */
        void drain() {
            if (wip.getAndIncrement() != 0) {
                return;
            }
            do {
                while (emitter.requested() > 0 && !emitter.isCancelled()) {
                    LogEvent next = log.next(this);
                    if (next == null) {
                        break;
                    }
                    emitter.emit(next);
                }
                if (log.closed && !emitter.isCancelled() && log.caughtUp(this)) {
                    emitter.complete();
                }
            } while (wip.decrementAndGet() != 0);
        }
    }
}
