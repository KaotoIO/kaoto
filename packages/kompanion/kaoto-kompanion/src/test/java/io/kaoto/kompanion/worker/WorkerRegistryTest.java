package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class WorkerRegistryTest {

    @Test
    void isConnectedReturnsFalseBeforeRegistration() {
        var registry = new WorkerRegistry();
        assertFalse(registry.isConnected("exec-1"));
    }

    @Test
    void isConnectedReturnsTrueAfterRegistration() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        assertTrue(registry.isConnected("exec-1"));
    }

    @Test
    void unregisterRemovesEntry() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.unregister("exec-1", "conn-1");
        assertFalse(registry.isConnected("exec-1"));
    }

    @Test
    void unregisterIsNoOpWhenConnectionIdDoesNotMatch() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.unregister("exec-1", "conn-2");
        assertTrue(registry.isConnected("exec-1"), "Second connection's close must not evict the first's registration");
    }

    @Test
    void secondWorkerKeepsRegistrationAfterFirstDisconnects() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        // Second worker with the same executionId connects and replaces the first
        registry.register("exec-1", "conn-2", msg -> {});
        // First worker disconnects
        registry.unregister("exec-1", "conn-1");
        // Second worker must still be registered
        assertTrue(registry.isConnected("exec-1"), "Second worker must remain registered after first disconnects");
        // Second worker disconnects
        registry.unregister("exec-1", "conn-2");
        assertFalse(registry.isConnected("exec-1"));
    }

    @Test
    void ackCompletesCorrelatedFuture() throws Exception {
        var registry = new WorkerRegistry();
        var sent = new ArrayList<String>();
        registry.register("exec-1", "conn-1", sent::add);

        CompletableFuture<WorkerRegistry.AckResult> future = registry.sendCommand(
                "exec-1",
                "corr-1",
                "{\"type\":\"camel.cmd.route.suspend\",\"correlationId\":\"corr-1\",\"routeId\":\"hello-route\"}");

        registry.receiveAck("exec-1", "corr-1", true, null);

        var result = future.get(2, TimeUnit.SECONDS);
        assertTrue(result.success());
        assertEquals(1, sent.size());
    }

    @Test
    void sendCommandFutureRemainsIncompleteWithoutAck() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        var future = registry.sendCommand("exec-1", "corr-x", "{}");
        assertFalse(future.isDone());
    }

    @Test
    void getResultReturnsPendingBeforeAck() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.sendCommand("exec-1", "corr-pending", "{}");
        var result = registry.getResult("exec-1", "corr-pending");
        assertNotNull(result);
        assertEquals("pending", result.status());
    }

    @Test
    void getResultReturnsAckedAfterReceiveAck() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.sendCommand("exec-1", "corr-done", "{}");
        registry.receiveAck("exec-1", "corr-done", true, "ok");
        var result = registry.getResult("exec-1", "corr-done");
        assertNotNull(result);
        assertEquals("acked", result.status());
        assertTrue(result.success());
        assertEquals("ok", result.detail());
    }

    @Test
    void getResultReturnsNullForUnknownCorrelationId() {
        var registry = new WorkerRegistry();
        assertNull(registry.getResult("exec-1", "unknown-corr"));
    }

    @Test
    void unregisterCompletesAllPendingFuturesExceptionally() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        var future = registry.sendCommand("exec-1", "corr-orphan", "{}");
        assertFalse(future.isDone());
        registry.unregister("exec-1", "conn-1");
        assertTrue(future.isCompletedExceptionally());
    }

    @Test
    void unregisterEvictsResultStore() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.sendCommand("exec-1", "corr-evict", "{}");
        registry.receiveAck("exec-1", "corr-evict", true, null);
        registry.unregister("exec-1", "conn-1");
        assertNull(registry.getResult("exec-1", "corr-evict"));
    }

    @Test
    void unregisterOnlyAffectsTargetExecution() throws Exception {
        var registry = new WorkerRegistry();
        registry.register("exec-a", "conn-a", msg -> {});
        registry.register("exec-b", "conn-b", msg -> {});

        var futureA = registry.sendCommand("exec-a", "corr-a", "{}");
        var futureB = registry.sendCommand("exec-b", "corr-b", "{}");

        // Disconnect exec-a only
        registry.unregister("exec-a", "conn-a");

        // exec-a's future must be cancelled
        assertTrue(futureA.isCompletedExceptionally());
        // exec-b's future must NOT be affected
        assertFalse(futureB.isDone());
    }

    @Test
    void receiveAckWithFailureStoresFailedStatus() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        registry.sendCommand("exec-1", "corr-fail", "{}");
        registry.receiveAck("exec-1", "corr-fail", false, "route not found");
        var result = registry.getResult("exec-1", "corr-fail");
        assertNotNull(result);
        assertEquals("failed", result.status());
        assertFalse(result.success());
        assertEquals("route not found", result.detail());
    }

    @Test
    void reconnectFailsPendingCommandsWithTerminalResult() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        var pending = registry.sendCommand("exec-1", "corr-pending", "{}");
        registry.sendCommand("exec-1", "corr-acked", "{}");
        registry.receiveAck("exec-1", "corr-acked", true, "ok");

        registry.register("exec-1", "conn-2", msg -> {});

        assertTrue(pending.isCompletedExceptionally());
        var result = registry.getResult("exec-1", "corr-pending");
        assertNotNull(result, "results survive a reconnect");
        assertEquals("failed", result.status(), "polling must not report the command pending forever");
        assertEquals("acked", registry.getResult("exec-1", "corr-acked").status());
    }

    @Test
    void protocolOfIsNullUntilDetectedAndOnlyForTheOwner() {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        assertNull(registry.protocolOf("exec-1", "conn-1"));
        registry.protocolDetected("exec-1", "conn-other", WorkerProtocol.CONNECTOR);
        assertNull(registry.protocolOf("exec-1", "conn-1"), "a connection that is not the owner cannot set it");
        registry.protocolDetected("exec-1", "conn-1", WorkerProtocol.CONNECTOR);
        assertEquals(WorkerProtocol.CONNECTOR, registry.protocolOf("exec-1", "conn-1"));
        assertNull(registry.protocolOf("exec-1", "conn-other"));
    }

    @Test
    void protocolFutureSurvivesACallerTimeout() throws Exception {
        var registry = new WorkerRegistry();
        registry.register("exec-1", "conn-1", msg -> {});
        assertThrows(
                java.util.concurrent.TimeoutException.class,
                () -> registry.protocol("exec-1").get(10, TimeUnit.MILLISECONDS));
        registry.protocolDetected("exec-1", "conn-1", WorkerProtocol.BRIDGE);
        assertEquals(WorkerProtocol.BRIDGE, registry.protocol("exec-1").get(1, TimeUnit.SECONDS));
    }
}
