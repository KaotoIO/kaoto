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

    private record ProcessorEntry(String connectionId, BroadcastProcessor<String> processor) {}

    private final Map<String, ProcessorEntry> processors = new ConcurrentHashMap<>();

    /** Returns the event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        ProcessorEntry entry = processors.get(executionId);
        return entry == null ? null : entry.processor().toHotStream();
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
