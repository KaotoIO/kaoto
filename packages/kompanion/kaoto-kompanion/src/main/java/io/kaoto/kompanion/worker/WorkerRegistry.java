package io.kaoto.kompanion.worker;

import io.kaoto.kompanion.model.CommandResult;
import io.kaoto.kompanion.model.ExecutionInfo;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class WorkerRegistry {

    public record AckResult(boolean success, String detail) {}

    /** Snapshot of the channel state at the moment a command is submitted. */
    public record ChannelSnapshot(String connectionId, CompletableFuture<WorkerProtocol> protocol) {}

    /**
     * Per-command state, kept for polling while the execution lives, within limits (see {@link #sweep}). {@code since}
     * is when it was sent while pending, and when it got its result afterwards.
     */
    private record PendingEntry(CompletableFuture<AckResult> future, CommandResult result, Instant since) {}

    private record ChannelEntry(
            String connectionId,
            Consumer<String> sendFrame,
            CompletableFuture<WorkerProtocol> protocol,
            AtomicReference<String> camelVersion,
            AtomicReference<ExecutionInfo> info) {}

    // executionId → channel (including the owning connectionId)
    private final Map<String, ChannelEntry> channels = new ConcurrentHashMap<>();
    // executionId → (correlationId → PendingEntry)
    private final Map<String, Map<String, PendingEntry>> executions = new ConcurrentHashMap<>();

    /** How long the result of a command is kept for polling, once it has one. */
    @ConfigProperty(name = "kaoto.kompanion.command.result-ttl", defaultValue = "10m")
    Duration resultTtl = Duration.ofMinutes(10);

    /** A command the worker does not answer for this long fails. */
    @ConfigProperty(name = "kaoto.kompanion.command.pending-timeout", defaultValue = "10m")
    Duration pendingTimeout = Duration.ofMinutes(10);

    /** At most this many commands are kept per execution: the oldest results go first. */
    @ConfigProperty(name = "kaoto.kompanion.command.max-results", defaultValue = "10000")
    int maxResults = 10000;

    Clock clock = Clock.systemUTC();

    private final AtomicLong lastSweep = new AtomicLong();

    public void register(String executionId, String connectionId, Consumer<String> sendFrame) {
        ChannelEntry current = new ChannelEntry(
                connectionId, sendFrame, new CompletableFuture<>(), new AtomicReference<>(), new AtomicReference<>());
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
                    return new PendingEntry(
                            entry.future(), CommandResult.acked(correlationId, false, reason), clock.instant());
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

    /** Records the Camel version the worker reported (camel-cli-connector hello). */
    public void camelVersionDetected(String executionId, String camelVersion) {
        ChannelEntry entry = channels.get(executionId);
        if (entry != null) {
            entry.camelVersion().set(camelVersion);
        }
    }

    /** Records what the worker said about itself (camel-cli-connector hello). */
    public void workerDescribed(String executionId, String camelVersion, String name, Long pid) {
        ChannelEntry entry = channels.get(executionId);
        if (entry != null) {
            entry.camelVersion().set(camelVersion);
            entry.info().set(new ExecutionInfo(executionId, null, camelVersion, name, pid));
        }
    }

    /** The connected workers. */
    public List<ExecutionInfo> executions() {
        List<ExecutionInfo> all = new ArrayList<>();
        channels.forEach((executionId, entry) -> {
            WorkerProtocol protocol = entry.protocol().getNow(null);
            ExecutionInfo info = entry.info().get();
            all.add(new ExecutionInfo(
                    executionId,
                    protocol != null ? protocol.name() : null,
                    info != null ? info.camelVersion() : entry.camelVersion().get(),
                    info != null ? info.name() : null,
                    info != null ? info.pid() : null));
        });
        all.sort(Comparator.comparing(ExecutionInfo::executionId));
        return all;
    }

    /** Returns the Camel version the connected worker reported, or null when unknown. */
    public String camelVersion(String executionId) {
        ChannelEntry entry = channels.get(executionId);
        return entry != null ? entry.camelVersion().get() : null;
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
     * Returns a snapshot of the current channel for the given executionId, or {@code null} when no worker is connected.
     * Callers should use the same snapshot for both protocol detection and command dispatch so that encoding and
     * sending target the same connection.
     */
    public ChannelSnapshot channelFor(String executionId) {
        ChannelEntry entry = channels.get(executionId);
        return entry == null ? null : new ChannelSnapshot(entry.connectionId(), entry.protocol());
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
            // room for this one
            sweep(entries, 1);
            entries.put(correlationId, new PendingEntry(future, CommandResult.pending(correlationId), clock.instant()));
        }
        ChannelEntry channelEntry = channels.get(executionId);
        if (channelEntry != null) {
            channelEntry.sendFrame().accept(jsonFrame);
        } else {
            future.completeExceptionally(new IllegalStateException("No channel for executionId: " + executionId));
        }
        return future;
    }

    /**
     * Send a JSON command frame to the worker, but only when {@code connectionId} is still the current owner of the
     * execution. If a reconnect replaced the channel since the command was encoded, the future is completed
     * exceptionally so the caller does not send a frame encoded for the wrong protocol to the new worker.
     */
    public CompletableFuture<AckResult> sendCommand(
            String executionId, String connectionId, String correlationId, String jsonFrame) {
        var future = new CompletableFuture<AckResult>();
        PendingEntry pending = new PendingEntry(future, CommandResult.pending(correlationId), clock.instant());
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries != null) {
            // room for this one
            sweep(entries, 1);
            entries.put(correlationId, pending);
        }
        ChannelEntry channelEntry = channels.get(executionId);
        if (channelEntry == null) {
            String reason = "No channel for executionId: " + executionId;
            if (entries != null) {
                entries.replace(
                        correlationId,
                        pending,
                        new PendingEntry(future, CommandResult.acked(correlationId, false, reason), clock.instant()));
            }
            future.completeExceptionally(new IllegalStateException(reason));
        } else if (!channelEntry.connectionId().equals(connectionId)) {
            String reason = "Worker reconnected during command encoding for executionId: " + executionId;
            if (entries != null) {
                entries.replace(
                        correlationId,
                        pending,
                        new PendingEntry(future, CommandResult.acked(correlationId, false, reason), clock.instant()));
            }
            future.completeExceptionally(new IllegalStateException(reason));
        } else {
            channelEntry.sendFrame().accept(jsonFrame);
        }
        return future;
    }

    /** Called by WorkerWebSocketHandler when a camel.cmd.ack frame arrives. */
    public void receiveAck(String executionId, String correlationId, boolean success, String detail) {
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries != null) {
            entries.computeIfPresent(correlationId, (k, existing) -> {
                if (!existing.future().isDone()) {
                    existing.future().complete(new AckResult(success, detail));
                }
                // Replace with final result (future is done; keep entry for polling)
                return new PendingEntry(
                        existing.future(), CommandResult.acked(correlationId, success, detail), clock.instant());
            });
        }
    }

    /**
     * Forgets the result of a command whose submitter already got it: the correlationId is only given out with the
     * answer of the submit, so nobody can poll a command answered right away, and keeping its result only fills the
     * memory (one entry per command for the lifetime of the execution).
     */
    public void forget(String executionId, String correlationId) {
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries != null) {
            entries.remove(correlationId);
        }
    }

    /**
     * Keeps the stored commands within limits: results expire {@code resultTtl} after they arrived, a command not
     * answered within {@code pendingTimeout} fails, and above {@code maxResults} the oldest results go. Runs at most
     * once a second, or when the execution has too many commands.
     */
    private void sweep(Map<String, PendingEntry> entries, int adding) {
        Instant now = clock.instant();
        long last = lastSweep.get();
        if (entries.size() + adding <= maxResults && now.toEpochMilli() - last < 1000 && now.toEpochMilli() >= last) {
            return;
        }
        lastSweep.set(now.toEpochMilli());
        entries.replaceAll((correlationId, entry) -> {
            if (!entry.future().isDone() && now.isAfter(entry.since().plus(pendingTimeout))) {
                String reason = "No answer from the worker after " + pendingTimeout.toSeconds() + "s";
                entry.future().completeExceptionally(new IllegalStateException(reason));
                return new PendingEntry(entry.future(), CommandResult.acked(correlationId, false, reason), now);
            }
            return entry;
        });
        entries.entrySet()
                .removeIf(e -> e.getValue().future().isDone()
                        && now.isAfter(e.getValue().since().plus(resultTtl)));
        int excess = entries.size() + adding - maxResults;
        if (excess > 0) {
            entries.entrySet().stream()
                    .filter(e -> e.getValue().future().isDone())
                    .sorted(Comparator.comparing(e -> e.getValue().since()))
                    .limit(excess)
                    .map(Map.Entry::getKey)
                    .toList()
                    .forEach(entries::remove);
        }
    }

    /**
     * Returns the stored CommandResult for a given correlationId, or null if the correlationId is unknown (never
     * issued, or the execution was unregistered).
     */
    public CommandResult getResult(String executionId, String correlationId) {
        Map<String, PendingEntry> entries = executions.get(executionId);
        if (entries == null) return null;
        sweep(entries, 0);
        PendingEntry entry = entries.get(correlationId);
        return entry == null ? null : entry.result();
    }
}
