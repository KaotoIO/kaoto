package io.kaoto.kompanion.worker;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.jboss.logging.Logger;

@ApplicationScoped
public class ExecutionEventBus {

    private static final Logger LOG = Logger.getLogger(ExecutionEventBus.class);

    private static final class ProcessorEntry {
        private final String connectionId;
        private final BroadcastProcessor<String> processor;
        // last worker-ready frame, replayed to late subscribers (the worker says hello right after connecting,
        // before any client can subscribe, since the stream only exists once the worker is connected)
        private volatile String readyFrame;

        ProcessorEntry(String connectionId, BroadcastProcessor<String> processor) {
            this.connectionId = connectionId;
            this.processor = processor;
        }

        String connectionId() {
            return connectionId;
        }

        BroadcastProcessor<String> processor() {
            return processor;
        }
    }

    private final Map<String, ProcessorEntry> processors = new ConcurrentHashMap<>();

    /** Returns the event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry == null) {
            return null;
        }
        // the SSE writer requests one item at a time, so a burst of frames (e.g. result + snapshot) arriving while a
        // write is in flight failed the stream with BackPressureFailure. Buffer per subscriber (bounded): only a
        // subscriber that stays stalled for 4096 frames gets its own stream failed.
        Multi<String> hot = entry.processor().toHotStream();
        String ready = entry.readyFrame;
        if (ready != null) {
            hot = Multi.createBy().concatenating().streams(Multi.createFrom().item(ready), hot);
        }
        return hot.onOverflow().buffer(4096);
    }

    /** Called by WorkerWebSocketHandler on open to create the stream before any events arrive. */
    public void open(String executionId, String connectionId) {
        processors.computeIfAbsent(executionId, id -> new ProcessorEntry(connectionId, BroadcastProcessor.create()));
        LOG.debugf("Event bus opened for execution=%s connectionId=%s", executionId, connectionId);
    }

    /** Publish a raw JSON frame to all current subscribers for this execution. */
    public void publish(String executionId, String jsonFrame) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry != null) {
            entry.processor().onNext(jsonFrame);
        }
    }

    /** Publish the worker-ready frame; it is also replayed to clients that subscribe later. */
    public void publishReady(String executionId, String jsonFrame) {
        ProcessorEntry entry = processors.get(executionId);
        if (entry != null) {
            entry.readyFrame = jsonFrame;
            entry.processor().onNext(jsonFrame);
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
