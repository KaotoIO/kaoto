package io.kaoto.kompanion.worker;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.MultiEmitter;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
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
 *
 * <p>Every entry has a {@link Tag}: its kind, the route it is about (if any) and the {@link View} it belongs to. A
 * client without a {@link Filter} gets the raw view (every frame as the worker sent it); a client with one gets the
 * sliced view (frames cut per route), restricted to the kinds and routes of its filter, which it can change while it
 * reads.
 */
@ApplicationScoped
public class ExecutionEventBus {

    private static final Logger LOG = Logger.getLogger(ExecutionEventBus.class);

    /** The state key of the worker-ready frame, replayed to every client. */
    public static final String READY = "ready";

    /** Kinds every filtered client gets, whatever its filter. */
    public static final Set<String> ALWAYS = Set.of(READY, "result", "lifecycle", "gap", "subscribed");

    /** An event of the log: its sequence (the SSE event id) and its JSON. */
    public record LogEvent(long seq, String json) {}

    /** Which clients an entry is for: the ones without a filter (raw), with one (sliced), or both. */
    public enum View {
        RAW,
        SLICED,
        BOTH
    }

    /** What an entry is about: its kind (status, trace, result, ...), its route (or null) and its view. */
    public record Tag(String kind, String routeId, View view) {
        public static Tag of(String kind) {
            return new Tag(kind, null, View.BOTH);
        }

        public static Tag raw(String kind) {
            return new Tag(kind, null, View.RAW);
        }

        public static Tag sliced(String kind, String routeId) {
            return new Tag(kind, routeId, View.SLICED);
        }
    }

    /**
     * What a client wants: the kinds (null: all of them) and the routes (null: all of them; entries about no route are
     * always included). Kinds in {@link #ALWAYS} are always included. {@code ensure} lists the features the client asks
     * the Kompanion to keep on in the app while it reads (trace, debug: see {@link ConnectorDemand}).
     */
    public record Filter(Set<String> kinds, Set<String> routes, Set<String> ensure) {
        public Filter {
            kinds = kinds == null ? null : Set.copyOf(kinds);
            routes = routes == null ? null : Set.copyOf(routes);
            ensure = ensure == null ? Set.of() : Set.copyOf(ensure);
        }

        public Filter(Set<String> kinds, Set<String> routes) {
            this(kinds, routes, null);
        }

        boolean matches(Tag tag) {
            if (tag.view() == View.RAW) {
                return false;
            }
            if (ALWAYS.contains(tag.kind())) {
                return true;
            }
            if (kinds != null && !kinds.contains(tag.kind())) {
                return false;
            }
            return routes == null || tag.routeId() == null || routes.contains(tag.routeId());
        }
    }

    private record Entry(long seq, String key, String json, int bytes, Tag tag) {}

    private static final Tag EVENT = new Tag("event", null, View.BOTH);

    @ConfigProperty(name = "kaoto.kompanion.events.buffer", defaultValue = "4096")
    int bufferSize = 4096;

    @ConfigProperty(name = "kaoto.kompanion.events.buffer-bytes", defaultValue = "33554432")
    long bufferBytes = 32L * 1024 * 1024;

    private final Map<String, ExecutionLog> logs = new ConcurrentHashMap<>();
    // told the executionId whenever its clients or their filters change, or its log ends
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();

    /** Registers a listener told the executionId whenever its clients or their filters change, or its log ends. */
    public void onSubscriptionsChanged(Consumer<String> listener) {
        listeners.add(listener);
    }

    private void subscriptionsChanged(String executionId) {
        for (Consumer<String> listener : listeners) {
            try {
                listener.accept(executionId);
            } catch (RuntimeException e) {
                LOG.warnf(e, "Subscription listener failed for execution=%s", executionId);
            }
        }
    }

    /** The latest value of a state of the given execution, or null. */
    public String latestState(String executionId, String key) {
        ExecutionLog log = logs.get(executionId);
        if (log == null) {
            return null;
        }
        synchronized (log) {
            Entry entry = log.states.get(key);
            return entry != null ? entry.json() : null;
        }
    }

    /** Returns the raw event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        Multi<LogEvent> events = eventsFor(executionId, null, null);
        return events == null ? null : events.map(LogEvent::json);
    }

    /**
     * Returns the events of the given executionId with their sequence, or null if none exists. Without
     * {@code lastEventId} the client gets the current states and the events from now on; with it, also the events after
     * that one still in the log (a gap event for the ones that are not). Without {@code filter} the client gets the raw
     * view; with one, the sliced view, starting with a {@code kompanion.subscribed} event carrying the id to change the
     * filter with ({@link #updateFilter}).
     */
    public Multi<LogEvent> eventsFor(String executionId, Long lastEventId, Filter filter) {
        ExecutionLog log = logs.get(executionId);
        if (log == null) {
            return null;
        }
        return Multi.createFrom().emitter(emitter -> {
            var subscriber = log.subscribe(emitter, lastEventId, filter);
            emitter.onRequest(n -> subscriber.drain());
            emitter.onTermination(() -> log.unsubscribe(subscriber));
            subscriber.drain();
        });
    }

    /**
     * Changes the filter of a filtered client: it then gets the current value of every state in its new filter, and the
     * new events that match it. Returns false when the client is unknown (or not filtered).
     */
    public boolean updateFilter(String executionId, String subscriptionId, Filter filter) {
        ExecutionLog log = logs.get(executionId);
        Subscriber subscriber = log != null ? log.subscribers.get(subscriptionId) : null;
        if (subscriber == null || subscriber.filter == null || filter == null) {
            return false;
        }
        synchronized (log) {
            subscriber.filter = filter;
            subscriber.delivered.clear();
        }
        subscriber.drain();
        subscriptionsChanged(executionId);
        return true;
    }

    /** The filters of the filtered clients of the given execution, by subscription id. */
    public Map<String, Filter> filters(String executionId) {
        ExecutionLog log = logs.get(executionId);
        Map<String, Filter> filters = new HashMap<>();
        if (log != null) {
            log.subscribers.forEach((id, s) -> {
                if (s.filter != null) {
                    filters.put(id, s.filter);
                }
            });
        }
        return filters;
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

    /** Publishes an event for every client: every one of them gets it, in order. */
    public void publish(String executionId, String jsonFrame) {
        publish(executionId, EVENT, jsonFrame);
    }

    /** Publishes an event for the clients its tag is for. */
    public void publish(String executionId, Tag tag, String jsonFrame) {
        ExecutionLog log = logs.get(executionId);
        if (log != null) {
            log.append(null, tag, jsonFrame);
        }
    }

    /**
     * Publishes the new value of a state (status, debug, ...) for every client: a client that did not get the previous
     * value yet only gets this one.
     */
    public void publishState(String executionId, String key, String jsonFrame) {
        publishState(executionId, key, Tag.of(key), jsonFrame);
    }

    /** Publishes the new value of a state for the clients its tag is for. */
    public void publishState(String executionId, String key, Tag tag, String jsonFrame) {
        ExecutionLog log = logs.get(executionId);
        if (log != null) {
            log.append(key, tag, jsonFrame);
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
        subscriptionsChanged(executionId);
        LOG.debugf("Event log closed for execution=%s connectionId=%s", executionId, connectionId);
    }

    private final class ExecutionLog {
        private final String executionId;
        // the worker connection that owns the log; a reconnecting worker takes it over (see open)
        private volatile String connectionId;
        private final ConcurrentSkipListMap<Long, Entry> events = new ConcurrentSkipListMap<>();
        // key -> latest entry
        private final Map<String, Entry> states = new LinkedHashMap<>();
        // subscription id -> client
        private final Map<String, Subscriber> subscribers = new ConcurrentHashMap<>();
        private long seq;
        private long eventBytes;
        // the events up to this sequence were dropped from the ring
        private long droppedUpTo;
        private volatile boolean closed;

        ExecutionLog(String executionId, String connectionId) {
            this.executionId = executionId;
            this.connectionId = connectionId;
        }

        void append(String key, Tag tag, String json) {
            synchronized (this) {
                if (closed) {
                    return;
                }
                Entry entry = new Entry(++seq, key, json, json.getBytes(StandardCharsets.UTF_8).length, tag);
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
            subscribers.values().forEach(Subscriber::drain);
        }

        synchronized void removeState(String key) {
            states.remove(key);
        }

        Subscriber subscribe(MultiEmitter<? super LogEvent> emitter, Long lastEventId, Filter filter) {
            Subscriber subscriber;
            synchronized (this) {
                // a new client starts from now; a client that comes back goes on after the last event it got
                long from = lastEventId != null ? Math.min(lastEventId, seq) : seq;
                subscriber = new Subscriber(this, emitter, from, filter);
                if (filter != null) {
                    subscriber.pending = new LogEvent(
                            from,
                            "{\"type\":\"kompanion.subscribed\",\"executionId\":\"" + executionId
                                    + "\",\"subscriptionId\":\"" + subscriber.id + "\"}");
                }
            }
            subscribers.put(subscriber.id, subscriber);
            if (filter != null) {
                subscriptionsChanged(executionId);
            }
            return subscriber;
        }

        void unsubscribe(Subscriber subscriber) {
            if (subscribers.remove(subscriber.id) != null && subscriber.filter != null) {
                subscriptionsChanged(executionId);
            }
        }

        void close() {
            synchronized (this) {
                closed = true;
            }
            subscribers.values().forEach(Subscriber::drain);
        }

        /** The next item for the subscriber, moving its position, or null when it read everything. */
        synchronized LogEvent next(Subscriber s) {
            if (s.pending != null) {
                LogEvent pending = s.pending;
                s.pending = null;
                return pending;
            }
            if (s.eventCursor < droppedUpTo) {
                long from = s.eventCursor + 1;
                s.eventCursor = droppedUpTo;
                return new LogEvent(
                        droppedUpTo,
                        "{\"type\":\"kompanion.gap\",\"executionId\":\"" + executionId + "\",\"from\":" + from
                                + ",\"to\":" + droppedUpTo + "}");
            }
            Map.Entry<Long, Entry> event = nextEvent(s);
            Entry state = nextState(s);
            if (state != null && (event == null || state.seq() < event.getKey())) {
                s.delivered.put(state.key(), state.seq());
                return new LogEvent(state.seq(), state.json());
            }
            if (event != null) {
                s.eventCursor = event.getKey();
                return new LogEvent(event.getKey(), event.getValue().json());
            }
            // the events the client does not want are read too
            s.eventCursor = Math.max(s.eventCursor, events.isEmpty() ? s.eventCursor : events.lastKey());
            return null;
        }

        /** Whether the subscriber read everything, without moving its position. */
        synchronized boolean caughtUp(Subscriber s) {
            return s.pending == null && s.eventCursor >= droppedUpTo && nextEvent(s) == null && nextState(s) == null;
        }

        /** The next event the subscriber wants. */
        private Map.Entry<Long, Entry> nextEvent(Subscriber s) {
            Map.Entry<Long, Entry> event = events.higherEntry(s.eventCursor);
            while (event != null && !s.wants(event.getValue().tag())) {
                event = events.higherEntry(event.getKey());
            }
            return event;
        }

        /** The oldest state value the subscriber wants and did not get yet. */
        private Entry nextState(Subscriber s) {
            Entry next = null;
            for (Entry e : states.values()) {
                if (s.wants(e.tag())
                        && e.seq() > s.delivered.getOrDefault(e.key(), 0L)
                        && (next == null || e.seq() < next.seq())) {
                    next = e;
                }
            }
            return next;
        }
    }

    /** A client of a log: its position, its filter, and the stream it reads at its own pace. */
    private static final class Subscriber {
        private final String id = UUID.randomUUID().toString();
        private final ExecutionLog log;
        private final MultiEmitter<? super LogEvent> emitter;
        private final AtomicInteger wip = new AtomicInteger();
        // the last event read, and the sequence of the last value read of every state
        private long eventCursor;
        private final Map<String, Long> delivered = new HashMap<>();
        // null: the raw view
        private volatile Filter filter;
        // sent before anything else
        private LogEvent pending;

        Subscriber(ExecutionLog log, MultiEmitter<? super LogEvent> emitter, long eventCursor, Filter filter) {
            this.log = log;
            this.emitter = emitter;
            this.eventCursor = eventCursor;
            this.filter = filter;
        }

        boolean wants(Tag tag) {
            Filter f = filter;
            return f == null ? tag.view() != View.SLICED : f.matches(tag);
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
