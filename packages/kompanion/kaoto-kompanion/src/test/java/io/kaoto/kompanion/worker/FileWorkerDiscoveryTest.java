package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileWorkerDiscoveryTest {

    private static final long PID = 4242;
    private static final String EXECUTION = "pid-" + PID;

    @TempDir
    Path dir;

    private final Map<Long, Instant> processes = new ConcurrentHashMap<>();
    private final WorkerRegistry registry = new WorkerRegistry();
    private final ExecutionEventBus eventBus = new ExecutionEventBus();
    private FileWorkerDiscovery discovery;
    private FakeConnector connector;

    @BeforeEach
    void setUp() throws Exception {
        eventBus.bufferSize = 64;
        ConnectorFrameHandler frames = new ConnectorFrameHandler();
        frames.registry = registry;
        frames.eventBus = eventBus;
        discovery = new FileWorkerDiscovery();
        discovery.registry = registry;
        discovery.eventBus = eventBus;
        discovery.frames = frames;
        discovery.staleAfter = Duration.ofSeconds(30);
        discovery.actionTimeout = Duration.ofSeconds(60);
        discovery.exitTimeout = Duration.ofSeconds(30);
        discovery.probe = pid -> Optional.ofNullable(processes.get(pid));
        discovery.clock = Clock.systemUTC();
        discovery.selfPid = 1;
        discovery.camelDir(dir);
        connector = new FakeConnector(dir, PID);
    }

    /** An app as the connector leaves it once Camel started. */
    private void startApp(String camelVersion) throws Exception {
        processes.put(PID, Instant.now().minusSeconds(10));
        connector.start("status", "action", "output", "trace", "receive", "debug", "history");
        connector.write("status", FakeConnector.status(camelVersion, "Started"));
        Files.setLastModifiedTime(connector.file("status"), FileTime.from(Instant.now()));
    }

    @Test
    void registersALiveApp() throws Exception {
        startApp("4.18.4");
        discovery.scan();

        assertTrue(registry.isConnected(EXECUTION));
        assertEquals(WorkerProtocol.FILE, registry.protocol(EXECUTION).get(1, TimeUnit.SECONDS));
        assertEquals("4.18.4", registry.camelVersion(EXECUTION));
        // the hello is replayed to the clients that subscribe later
        String ready = eventBus.streamFor(EXECUTION).collect().first().await().atMost(Duration.ofSeconds(1));
        assertTrue(ready.contains("\"connectorProtocol\":\"camel-cli-connector/file\""), ready);
    }

    @Test
    void waitsForCamelToStart() throws Exception {
        processes.put(PID, Instant.now().minusSeconds(10));
        connector.start("status");
        Files.setLastModifiedTime(connector.file("status"), FileTime.from(Instant.now()));
        discovery.scan();
        assertFalse(registry.isConnected(EXECUTION));

        connector.write("status", FakeConnector.status("4.22.1", "Started"));
        Files.setLastModifiedTime(connector.file("status"), FileTime.from(Instant.now()));
        discovery.scan();
        assertTrue(registry.isConnected(EXECUTION));
    }

    @Test
    void skipsWhatIsNotALiveAppAndDeletesNothing() throws Exception {
        // a killed app: files left behind, process gone
        new FakeConnector(dir, 1111).start("status", "action");
        // a pid reused by a process started after the lock file
        new FakeConnector(dir, 2222).start("status");
        processes.put(2222L, Instant.now().plusSeconds(60));
        // a live process whose connector stopped writing
        var stuck = new FakeConnector(dir, 3333).start("status");
        stuck.write("status", FakeConnector.status("4.18.4", "Started"));
        Files.setLastModifiedTime(
                stuck.file("status"), FileTime.from(Instant.now().minusSeconds(120)));
        processes.put(3333L, Instant.now().minusSeconds(600));
        // the Kompanion itself, orphan action files, the camel CLI's own files
        new FakeConnector(dir, 1).start("status");
        processes.put(1L, Instant.now().minusSeconds(600));
        Files.writeString(dir.resolve("5555-action.json"), "{}");
        Files.writeString(dir.resolve("5555.log"), "log");
        List<String> before = list();

        discovery.scan();

        for (String id : List.of("pid-1111", "pid-2222", "pid-3333", "pid-1", "pid-5555")) {
            assertFalse(registry.isConnected(id), id);
        }
        assertEquals(before, list());
    }

    @Test
    void unregistersWhenTheLockFileIsDeleted() throws Exception {
        startApp("4.22.1");
        discovery.scan();
        var pending = registry.sendCommand(EXECUTION, "c1", action("c1", "{\"action\":\"reset-stats\"}"));

        Files.delete(connector.lockFile());
        discovery.scan();

        assertFalse(registry.isConnected(EXECUTION));
        var failure = assertThrows(ExecutionException.class, () -> pending.get(1, TimeUnit.SECONDS));
        assertTrue(failure.getCause().getMessage().contains("disconnected"), failure.toString());
    }

    @Test
    void unregistersWhenTheProcessExits() throws Exception {
        startApp("4.22.1");
        discovery.scan();
        assertTrue(registry.isConnected(EXECUTION));

        // killed: the files stay
        processes.remove(PID);
        discovery.scan();
        assertFalse(registry.isConnected(EXECUTION));
        assertTrue(Files.exists(connector.lockFile()));
    }

    @Test
    void unregistersWhenThePidIsReused() throws Exception {
        startApp("4.22.1");
        discovery.scan();
        assertTrue(registry.isConnected(EXECUTION));

        // a process started after the lock file of the dead app was created
        processes.put(PID, Instant.now().plusSeconds(60));
        discovery.scan();
        assertFalse(registry.isConnected(EXECUTION));
        // and it is not registered again from the files of the dead app
        discovery.scan();
        assertFalse(registry.isConnected(EXECUTION));
    }

    private List<String> list() throws Exception {
        try (var files = Files.list(dir)) {
            return files.map(f -> f.getFileName().toString()).sorted().toList();
        }
    }

    private static String action(String requestId, String action) {
        return "{\"v\":1,\"type\":\"action\",\"requestId\":\"" + requestId + "\",\"action\":" + action + "}";
    }
}
