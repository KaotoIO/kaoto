package io.kaoto.companion.worker;

import io.kaoto.companion.model.CommandResult;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

@ApplicationScoped
public class WorkerRegistry {

    public record AckResult(boolean success, String detail) {}

    /** Per-command state stored for the lifetime of the execution. */
    private record PendingEntry(CompletableFuture<AckResult> future, CommandResult result) {}

    // executionId → callback that writes a JSON string to the worker's WebSocket
    private final Map<String, Consumer<String>> channels = new ConcurrentHashMap<>();
    // executionId → (correlationId → PendingEntry)
    private final Map<String, Map<String, PendingEntry>> executions = new ConcurrentHashMap<>();

    public void register(String executionId, Consumer<String> sendFrame) {
        channels.put(executionId, sendFrame);
        executions.put(executionId, new ConcurrentHashMap<>());
    }

    public void unregister(String executionId) {
        channels.remove(executionId);
        Map<String, PendingEntry> entries = executions.remove(executionId);
        if (entries != null) {
            entries.values().forEach(entry -> {
                if (!entry.future().isDone()) {
                    entry.future()
                            .completeExceptionally(new IllegalStateException("Worker disconnected before ack arrived"));
                }
            });
        }
    }

    public boolean isConnected(String executionId) {
        return channels.containsKey(executionId);
    }

    /**
     * Send a JSON command frame to the worker and return a future that completes when the worker sends back a
     * camel.cmd.ack with the matching correlationId. Also stores a "pending" CommandResult immediately so polling can
     * observe it.
     */
    public CompletableFuture<AckResult> sendCommand(String executionId, String correlationId, String jsonFrame) {
        var future = new CompletableFuture<AckResult>();
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries != null) {
            entries.put(correlationId, new PendingEntry(future, CommandResult.pending(correlationId)));
        }
        var channel = channels.get(executionId);
        if (channel != null) {
            channel.accept(jsonFrame);
        } else {
            future.completeExceptionally(new IllegalStateException("No channel for executionId: " + executionId));
        }
        return future;
    }

    /** Called by WorkerWebSocketHandler when a camel.cmd.ack frame arrives. */
    public void receiveAck(String executionId, String correlationId, boolean success, String detail) {
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries != null) {
            entries.compute(correlationId, (k, existing) -> {
                if (existing != null && !existing.future().isDone()) {
                    existing.future().complete(new AckResult(success, detail));
                }
                // Replace with final result (future is done; keep entry for polling)
                return new PendingEntry(
                        existing != null
                                ? existing.future()
                                : CompletableFuture.completedFuture(new AckResult(success, detail)),
                        CommandResult.acked(correlationId, success, detail));
            });
        }
    }

    /**
     * Returns the stored CommandResult for a given correlationId, or null if the correlationId is unknown (never
     * issued, or the execution was unregistered).
     */
    public CommandResult getResult(String executionId, String correlationId) {
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries == null) return null;
        PendingEntry entry = entries.get(correlationId);
        return entry == null ? null : entry.result();
    }
}
