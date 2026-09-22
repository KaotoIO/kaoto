package io.kaoto.camel.bridge.transport;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;

import io.kaoto.camel.bridge.protocol.OutboundMessage;
import org.junit.jupiter.api.Test;

class WorkerWebSocketClientTest {

    /** Port 1 is never listening — connection is refused immediately. */
    private static final String UNREACHABLE_URI = "ws://127.0.0.1:1/v1/worker/connect?executionId=t";

    private static final String UNREACHABLE_HOST_PORT = "127.0.0.1:1";
    private static final String EXECUTION_ID = "t";

    private static WorkerWebSocketClient unreachable() {
        return new WorkerWebSocketClient(UNREACHABLE_URI, UNREACHABLE_HOST_PORT, EXECUTION_ID, m -> {});
    }

    @Test
    void constructorDoesNotConnect() {
        assertFalse(unreachable().isConnected(), "constructor must not open the connection");
    }

    @Test
    void connectToUnreachableAddressReturnsFalseAndDoesNotThrow() {
        var client = unreachable();
        assertFalse(assertDoesNotThrow(client::connect));
        assertFalse(client.isConnected());
    }

    @Test
    void sendBeforeConnectIsDropped() {
        assertDoesNotThrow(() -> unreachable().send(new OutboundMessage.WorkerStopping("t", "natural")));
    }

    @Test
    void closeBeforeConnectDoesNotThrow() {
        assertDoesNotThrow(unreachable()::close);
    }
}
