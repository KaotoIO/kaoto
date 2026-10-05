package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Finds the Camel apps that use the file transport of camel-cli-connector (the default transport): each one has a lock
 * file {@code ~/.camel/{pid}} and writes {@code ~/.camel/{pid}-status.json} every second. Every live app is registered
 * as execution {@code pid-<pid>}, driven by a {@link FileWorker}, and unregistered once its lock file is gone (the app
 * stops) or its process exits.
 *
 * <p>Files left behind by a process that is gone (killed) are skipped, never deleted: the directory belongs to the
 * user, and the camel CLI uses it too. Apps on the WebSocket transport write no files and are never seen here.
 */
@ApplicationScoped
public class FileWorkerDiscovery {

    private static final Logger LOG = Logger.getLogger(FileWorkerDiscovery.class);

    private static final Pattern LOCK_FILE = Pattern.compile("\\d+");

    // the connector creates the lock file after the JVM started: a process started later reuses the pid of a dead one
    private static final Duration PID_REUSE_TOLERANCE = Duration.ofSeconds(2);

    /** Tells whether a process is alive, and when it started. */
    @FunctionalInterface
    public interface ProcessProbe {
        /** The start time of the live process, or empty when no such process runs. */
        Optional<Instant> startOf(long pid);

        ProcessProbe SYSTEM = pid -> ProcessHandle.of(pid)
                .filter(ProcessHandle::isAlive)
                .map(h -> h.info().startInstant().orElse(Instant.EPOCH));
    }

    private record Tracked(FileWorker worker, String executionId, String connectionId, Instant processStart) {}

    @Inject
    WorkerRegistry registry;

    @Inject
    ExecutionEventBus eventBus;

    @Inject
    ConnectorFrameHandler frames;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.enabled", defaultValue = "true")
    boolean enabled;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.camel-home")
    Optional<String> camelHome;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.scan-interval", defaultValue = "1s")
    Duration scanInterval;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.poll-interval", defaultValue = "100ms")
    Duration pollInterval;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.stale-after", defaultValue = "30s")
    Duration staleAfter;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.action-timeout", defaultValue = "60s")
    Duration actionTimeout;

    @ConfigProperty(name = "kaoto.kompanion.file-transport.exit-timeout", defaultValue = "30s")
    Duration exitTimeout;

    ProcessProbe probe = ProcessProbe.SYSTEM;
    Clock clock = Clock.systemUTC();
    long selfPid = ProcessHandle.current().pid();

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<Long, Tracked> tracked = new ConcurrentHashMap<>();
    // pids skipped as stale, reported once
    private final Set<Long> reported = new HashSet<>();
    // pids whose lock file is gone while the process still runs: pid -> when to report it did not exit
    private final Map<Long, Instant> exiting = new ConcurrentHashMap<>();
    private ScheduledExecutorService scheduler;
    private Path camelDir;

    void onStart(@Observes StartupEvent event) {
        if (!enabled) {
            LOG.info("camel-cli-connector file transport discovery disabled");
            return;
        }
        camelDir = camelDir(camelHome.orElse(null));
        LOG.infof("Discovering Camel apps through the camel-cli-connector files in %s", camelDir);
        scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "kompanion-file-transport");
            t.setDaemon(true);
            return t;
        });
        scheduler.scheduleWithFixedDelay(() -> safely(this::scan), 0, scanInterval.toMillis(), TimeUnit.MILLISECONDS);
        scheduler.scheduleWithFixedDelay(
                () -> safely(this::pollAll), pollInterval.toMillis(), pollInterval.toMillis(), TimeUnit.MILLISECONDS);
    }

    void onStop(@Observes ShutdownEvent event) {
        if (scheduler != null) {
            scheduler.shutdownNow();
            try {
                // the workers are only used by the polling thread: close them once it stopped, never next to it
                if (!scheduler.awaitTermination(1, TimeUnit.SECONDS)) {
                    LOG.warn("The camel-cli-connector file polling did not stop: its pending action files are left");
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        tracked.values().forEach(t -> t.worker().close());
    }

    /** The {@code .camel} directory of camel-cli-connector under the given home (default: {@code user.home}). */
    static Path camelDir(String home) {
        if (home == null || home.isBlank()) {
            // as Camel's HomeHelper
            home = System.getProperty("user.home");
            if (home == null || home.isBlank() || home.startsWith("?")) {
                home = System.getenv("HOME");
            }
        }
        return Path.of(home, ".camel");
    }

    void camelDir(Path camelDir) {
        this.camelDir = camelDir;
    }

    /** Registers the new apps and unregisters the ones that are gone. */
    void scan() {
        Set<Long> pids = lockFiles();
        Instant now = clock.instant();
        for (Tracked t : tracked.values()) {
            String gone = gone(t, pids, now);
            if (gone != null) {
                unregister(t, gone);
            }
        }
        exiting.entrySet().removeIf(e -> {
            if (probe.startOf(e.getKey()).isEmpty()) {
                return true;
            }
            if (now.isAfter(e.getValue())) {
                LOG.warnf(
                        "The process of pid %d still runs %ds after its Camel app stopped (lock file deleted): the"
                                + " runtime does not exit when Camel stops",
                        e.getKey(), exitTimeout.toSeconds());
                return true;
            }
            return false;
        });
        for (long pid : pids) {
            if (pid != selfPid && !tracked.containsKey(pid)) {
                discover(pid, now);
            }
        }
        reported.retainAll(pids);
    }

    /** Polls the files of every app (snapshots and actions). */
    void pollAll() {
        for (Tracked t : tracked.values()) {
            try {
                t.worker().poll();
            } catch (Exception e) {
                LOG.debugf(
                        e, "Error polling the files of pid %d: %s", t.worker().pid(), e.getMessage());
            }
        }
    }

    private void discover(long pid, Instant now) {
        Optional<Instant> start = probe.startOf(pid);
        String stale = null;
        if (start.isEmpty()) {
            stale = "its process is not running";
        } else if (created(lockFile(pid))
                .map(created -> start.get().isAfter(created.plus(PID_REUSE_TOLERANCE)))
                .orElse(false)) {
            stale = "its pid belongs to a process started after the lock file was created";
        } else if (statusAge(pid, now).compareTo(staleAfter) > 0) {
            stale = "its status file is not updated";
        }
        if (stale != null) {
            if (reported.add(pid)) {
                LOG.debugf("Skipping the camel-cli-connector files of pid %d: %s", pid, stale);
            }
            return;
        }
        String executionId = "pid-" + pid;
        String connectionId = "file:" + pid + ":" + start.get().toEpochMilli();
        FileWorker worker = new FileWorker(
                mapper,
                camelDir,
                pid,
                frame -> frames.onFrame(executionId, frame),
                new FileWorker.Timeouts(
                        actionTimeout, FileWorker.Timeouts.DEFAULT.busy(), FileWorker.Timeouts.DEFAULT.routeVerify()),
                clock);
        ObjectNode hello = worker.hello();
        if (hello == null) {
            // Camel is starting: the status holds no context yet
            return;
        }
        tracked.put(pid, new Tracked(worker, executionId, connectionId, start.get()));
        eventBus.open(executionId, connectionId);
        registry.register(executionId, connectionId, worker::submit);
        registry.protocolDetected(executionId, connectionId, WorkerProtocol.FILE);
        LOG.infof(
                "Worker connected: execution=%s transport=file pid=%d camelVersion=%s",
                executionId, pid, hello.path("camelVersion").asText());
        try {
            frames.onFrame(executionId, hello);
        } catch (Exception e) {
            LOG.warnf("Cannot publish the hello of pid %d: %s", pid, e.getMessage());
        }
    }

    /** Why the app is gone, or null when it is still there. */
    private String gone(Tracked t, Set<Long> pids, Instant now) {
        long pid = t.worker().pid();
        Optional<Instant> start = probe.startOf(pid);
        if (start.isEmpty()) {
            return "process exited";
        }
        if (!start.get().equals(t.processStart())) {
            return "pid reused by another process";
        }
        if (!pids.contains(pid)) {
            // Camel is stopping (the connector deletes its files), or the lock file was deleted to stop it
            exiting.put(pid, now.plus(exitTimeout));
            return "lock file deleted";
        }
        if (statusAge(pid, now).compareTo(staleAfter) > 0) {
            return "status file not updated for " + staleAfter.toSeconds() + "s";
        }
        return null;
    }

    private void unregister(Tracked t, String reason) {
        tracked.remove(t.worker().pid(), t);
        t.worker().close();
        LOG.infof("Worker disconnected: execution=%s transport=file (%s)", t.executionId(), reason);
        registry.unregister(t.executionId(), t.connectionId());
        eventBus.close(t.executionId(), t.connectionId());
    }

    private Set<Long> lockFiles() {
        Set<Long> pids = new HashSet<>();
        if (camelDir == null || !Files.isDirectory(camelDir)) {
            return pids;
        }
        try (Stream<Path> files = Files.list(camelDir)) {
            files.map(f -> f.getFileName().toString())
                    .filter(name -> LOCK_FILE.matcher(name).matches())
                    .forEach(name -> {
                        try {
                            pids.add(Long.parseLong(name));
                        } catch (NumberFormatException e) {
                            // not a pid
                        }
                    });
        } catch (IOException e) {
            LOG.debugf("Cannot list %s: %s", camelDir, e.getMessage());
        }
        return pids;
    }

    private Path lockFile(long pid) {
        return camelDir.resolve(Long.toString(pid));
    }

    private static Optional<Instant> created(Path file) {
        try {
            return Optional.of(Files.readAttributes(file, BasicFileAttributes.class)
                    .creationTime()
                    .toInstant());
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private Duration statusAge(long pid, Instant now) {
        try {
            Instant modified = Files.getLastModifiedTime(camelDir.resolve(pid + "-status.json"))
                    .toInstant();
            return Duration.between(modified, now);
        } catch (IOException e) {
            return Duration.ofDays(365);
        }
    }

    private static void safely(Runnable task) {
        try {
            task.run();
        } catch (Exception e) {
            LOG.warnf(e, "camel-cli-connector file transport: %s", e.getMessage());
        }
    }
}
