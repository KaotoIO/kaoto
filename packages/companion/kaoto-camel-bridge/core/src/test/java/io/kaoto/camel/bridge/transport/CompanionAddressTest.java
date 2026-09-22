package io.kaoto.camel.bridge.transport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CompanionAddressTest {

    @Test
    void parsesLocalHostPort() {
        var addr = CompanionAddress.parse("127.0.0.1:8000", "run-1");
        assertEquals("127.0.0.1", addr.host());
        assertEquals(8000, addr.port());
        assertEquals("run-1", addr.executionId());
    }

    @Test
    void parsesRemoteHostPort() {
        var addr = CompanionAddress.parse("192.168.1.100:9999", "exec-42");
        assertEquals("192.168.1.100", addr.host());
        assertEquals(9999, addr.port());
        assertEquals("exec-42", addr.executionId());
    }

    @Test
    void toUriAssemblesCorrectly() {
        var addr = CompanionAddress.parse("127.0.0.1:8000", "run-1");
        assertEquals("ws://127.0.0.1:8000/v1/worker/connect?executionId=run-1", addr.toUri());
    }

    @Test
    void rejectsBlankHostPort() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("", "run-1"));
    }

    @Test
    void rejectsNullHostPort() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse(null, "run-1"));
    }

    @Test
    void rejectsNullExecutionId() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1:8000", null));
    }

    @Test
    void rejectsMissingPort() {
        var ex = assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1", "run-1"));
        assertTrue(ex.getMessage().contains("host:port"));
    }

    @Test
    void rejectsNonIntegerPort() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1:abc", "run-1"));
    }

    @Test
    void rejectsPortZero() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1:0", "run-1"));
    }

    @Test
    void rejectsPortAboveMax() {
        assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1:65536", "run-1"));
    }

    @Test
    void rejectsBlankExecutionId() {
        var ex = assertThrows(IllegalArgumentException.class, () -> CompanionAddress.parse("127.0.0.1:8000", ""));
        assertTrue(ex.getMessage().contains("execution-id"));
    }
}
