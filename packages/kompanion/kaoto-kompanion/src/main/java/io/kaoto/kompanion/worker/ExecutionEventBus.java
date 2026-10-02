package io.kaoto.kompanion.worker;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@ApplicationScoped
public class ExecutionEventBus {

    private static final Logger LOG = Logger.getLogger(ExecutionEventBus.class);

    /**
     * A published frame. Snapshots are periodic (telemetry, connector status) and may weigh several MB: for a slow
     * subscriber only the latest one is kept, while every other frame is buffered.
     */
    private record Frame(String json, boolean snapshot) {}

    private static final class ProcessorEntry {
        // the worker connection that owns the stream; a reconnecting worker takes it over (see open)
        private volatile String connectionId;
        private final BroadcastProcessor<Frame> processor;
        // last worker-ready frame, replayed to late subscribers (the worker says hello right after connecting,
        // before any client can subscribe, since the stream only exists once the worker is connected)
        private volatile String readyFrame;

        ProcessorEntry(String connectionId, BroadcastProcessor<Frame> processor) {
            this.connectionId = connectionId;
            this.processor = processor;
        }

        String connectionId() {
            return connectionId;
        }

        BroadcastProcessor<Frame> processor() {
            return processor;
        }
    }

    private final Map<String, ProcessorEntry> processors = new ConcurrentHashMap<>();

    @ConfigProperty(name = "kaoto.kompanion.events.buffer", defaultValue = "4096")
    int bufferSize;

    /** Returns the event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry == null) {
            return null;
        }
        // the SSE writer requests one item at a time, so a burst of frames (e.g. result + snapshot) arriving while a
        // write is in flight failed the stream with BackPressureFailure. Buffer per subscriber (bounded): only a
        // subscriber that stays stalled for bufferSize frames gets its own stream failed. Snapshots are not buffered
        // but superseded: a stalled subscriber would otherwise retain several MB per snapshot interval. It now holds
        // at most two (the one the merge prefetched and the latest).
        Multi<String> events = entry.processor()
                .toHotStream()
                .filter(frame -> !frame.snapshot())
                .map(Frame::json)
                .onOverflow()
                .buffer(bufferSize);
        Multi<String> snapshots = entry.processor()
                .toHotStream()
                .filter(Frame::snapshot)
                .map(Frame::json)
                .onOverflow()
                .dropPreviousItems();
        Multi<String> hot = Multi.createBy().merging().withRequests(1).streams(events, snapshots);
        String ready = entry.readyFrame;
        if (ready != null) {
            hot = Multi.createBy().concatenating().streams(Multi.createFrom().item(ready), hot);
        }
        return hot;
    }

    /**
     * Called by WorkerWebSocketHandler on open to create the stream before any events arrive. When the worker of an
     * existing execution reconnects, the new connection takes over the stream, so the SSE subscribers keep receiving
     * and the close of the previous connection does not end it.
     */
    public void open(String executionId, String connectionId) {
        processors.compute(executionId, (id, existing) -> {
            if (existing == null) {
                return new ProcessorEntry(connectionId, BroadcastProcessor.create());
            }
            if (!existing.connectionId().equals(connectionId)) {
                existing.connectionId = connectionId;
                // the new connection says hello again
                existing.readyFrame = null;
            }
            return existing;
        });
        LOG.debugf("Event bus opened for execution=%s connectionId=%s", executionId, connectionId);
    }

    /** Publish a raw JSON frame to all current subscribers for this execution. */
    public void publish(String executionId, String jsonFrame) {
        publish(executionId, new Frame(jsonFrame, false));
    }

    /**
     * Publish a periodic snapshot frame. A subscriber that cannot keep up only receives the latest snapshot instead of
     * every one of them.
     */
    public void publishSnapshot(String executionId, String jsonFrame) {
        publish(executionId, new Frame(jsonFrame, true));
    }

    /** Publish the worker-ready frame; it is also replayed to clients that subscribe later. */
    public void publishReady(String executionId, String jsonFrame) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry != null) {
            entry.readyFrame = jsonFrame;
            entry.processor().onNext(new Frame(jsonFrame, false));
        }
    }

    private void publish(String executionId, Frame frame) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry != null) {
            entry.processor().onNext(frame);
        }
    }

    /**
     * Complete the stream and remove the processor. Only acts when the closing connectionId still owns the processor,
     * so a reconnecting worker does not terminate the new stream.
     */
    public void close(String executionId, String connectionId) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry == null || !entry.connectionId().equals(connectionId)) {
            return;
        }
        processors.remove(executionId);
        entry.processor().onComplete();
        LOG.debugf("Event bus closed for execution=%s connectionId=%s", executionId, connectionId);
    }
}
