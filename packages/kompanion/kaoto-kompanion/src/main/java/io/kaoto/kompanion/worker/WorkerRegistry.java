package io.kaoto.kompanion.worker;

import io.kaoto.kompanion.model.CommandResult;
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

    private record ChannelEntry(
            String connectionId, Consumer<String> sendFrame, CompletableFuture<WorkerProtocol> protocol) {}

    // executionId → channel (including the owning connectionId)
    private final Map<String, ChannelEntry> channels = new ConcurrentHashMap<>();
    // executionId → (correlationId → PendingEntry)
    private final Map<String, Map<String, PendingEntry>> executions = new ConcurrentHashMap<>();

    public void register(String executionId, String connectionId, Consumer<String> sendFrame) {
        ChannelEntry current = new ChannelEntry(connectionId, sendFrame, new CompletableFuture<>());
        ChannelEntry previous = channels.put(executionId, current);
        if (previous != null && !previous.connectionId().equals(connectionId)) {
            // a command may be waiting on the protocol of the previous connection: let it see the one of the new
            // connection instead of timing out
            current.protocol().whenComplete((protocol, failure) -> {
                if (failure == null) {
                    previous.protocol().complete(protocol);
                } else {
                    previous.protocol().completeExceptionally(failure);
                }
            });
            // the worker reconnected: commands sent on the previous connection are never answered on the new one, so
            // fail their futures and store a terminal result (polling would otherwise report them pending forever)
            Map<String, PendingEntry> entries = executions.get(executionId);
            if (entries != null) {
                String reason = "Worker reconnected before ack arrived";
                entries.replaceAll((correlationId, entry) -> {
                    if (entry.future().isDone()) {
                        return entry;
                    }
                    entry.future().completeExceptionally(new IllegalStateException(reason));
                    return new PendingEntry(entry.future(), CommandResult.acked(correlationId, false, reason));
                });
            }
        }
        // keep the command results of a previous connection of the same execution (reconnect): replacing the map
        // made in-flight commands answer 404 on polling
        executions.computeIfAbsent(executionId, id -> new ConcurrentHashMap<>());
    }

    /** Records the protocol detected from the first frame of the given connection. */
    public void protocolDetected(String executionId, String connectionId, WorkerProtocol protocol) {
        ChannelEntry entry = channels.get(executionId);
        if (entry != null && entry.connectionId().equals(connectionId)) {
            entry.protocol().complete(protocol);
        }
    }

    /**
     * Returns the protocol already detected for the given connection, or null when the connection does not own the
     * execution or has not sent its first frame yet.
     */
    public WorkerProtocol protocolOf(String executionId, String connectionId) {
        ChannelEntry entry = channels.get(executionId);
        return entry != null && entry.connectionId().equals(connectionId)
                ? entry.protocol().getNow(null)
                : null;
    }

    /**
     * Returns the protocol of the connected worker, waiting until its first frame arrived. Commands must not be encoded
     * before that, since the encoding depends on the protocol. The future is shared by every caller: wait on it with
     * {@code get(timeout)} and never {@code orTimeout}, which would complete it exceptionally for everyone.
     */
    public CompletableFuture<WorkerProtocol> protocol(String executionId) {
        ChannelEntry entry = channels.get(executionId);
        return entry == null
                ? CompletableFuture.failedFuture(
                        new IllegalStateException("No channel for executionId: " + executionId))
                : entry.protocol();
    }

    /**
     * Unregisters the worker for the given executionId only when the closing connection still owns it. If a new worker
     * with the same executionId has already reconnected, this is a no-op.
     */
    public void unregister(String executionId, String connectionId) {
        ChannelEntry current = channels.get(executionId);
        if (current == null || !current.connectionId().equals(connectionId)) {
            return;
        }
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

    /** Returns true when connectionId is the current owner of executionId. */
    public boolean isOwner(String executionId, String connectionId) {
        ChannelEntry entry = channels.get(executionId);
        return entry != null && entry.connectionId().equals(connectionId);
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
        ChannelEntry channelEntry = channels.get(executionId);
        if (channelEntry != null) {
            channelEntry.sendFrame().accept(jsonFrame);
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
