package io.kaoto.companion.worker;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.jboss.logging.Logger;

@ApplicationScoped
public class ExecutionEventBus {

    private static final Logger LOG = Logger.getLogger(ExecutionEventBus.class);

    private final Map<String, BroadcastProcessor<String>> processors = new ConcurrentHashMap<>();

    /** Returns the event stream for the given executionId, or null if none exists. */
    public Multi<String> streamFor(String executionId) {
        BroadcastProcessor<String> processor = processors.get(executionId);
        return processor == null ? null : processor.toHotStream();
    }

    /** Called by WorkerWebSocketHandler on open to create the stream before any events arrive. */
    public void open(String executionId) {
        processors.computeIfAbsent(executionId, id -> BroadcastProcessor.create());
        LOG.debugf("Event bus opened for execution=%s", executionId);
    }

    /** Publish a raw JSON frame to all current subscribers for this execution. */
    public void publish(String executionId, String jsonFrame) {
        BroadcastProcessor<String> processor = processors.get(executionId);
        if (processor != null) {
            processor.onNext(jsonFrame);
        }
    }

    /** Complete the stream and remove the processor. Called when the worker disconnects. */
    public void close(String executionId) {
        BroadcastProcessor<String> processor = processors.remove(executionId);
        if (processor != null) {
            processor.onComplete();
            LOG.debugf("Event bus closed for execution=%s", executionId);
        }
    }
}
