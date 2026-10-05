package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ConnectorActionsTest {

    @Test
    void parsesReleasedSnapshotAndProductVersions() {
        assertNotNull(ConnectorActions.of("4.18.4"));
        assertNotNull(ConnectorActions.of("4.23.0-SNAPSHOT"));
        assertNotNull(ConnectorActions.of("4.18.0.redhat-00001"));
        assertNull(ConnectorActions.of(null));
        assertNull(ConnectorActions.of("unknown"));
    }

    @Test
    void actionsFollowTheReleases() {
        var v418 = ConnectorActions.of("4.18.4");
        var v421 = ConnectorActions.of("4.21.0");
        var v422 = ConnectorActions.of("4.22.1");
        var v423 = ConnectorActions.of("4.23.0-SNAPSHOT");
        for (var v : new ConnectorActions[] {v418, v421, v422, v423}) {
            for (String action : new String[] {
                "route", "reset-stats", "send", "trace", "debug", "route-dump", "route-structure", "receive"
            }) {
                assertTrue(v.supports(action), action);
            }
            assertFalse(v.supports("no-such-action"));
        }
        assertFalse(v418.supports("route-topology"));
        assertTrue(v421.supports("route-topology"));
        assertFalse(v421.supports("processor-detail"));
        assertTrue(v422.supports("processor-detail"));
        assertTrue(v423.supports("vault-refresh"));
    }

    @Test
    void multiSlotFrom421AndBodyEncodingFrom423() {
        assertFalse(ConnectorActions.of("4.18.4").multiSlot());
        assertFalse(ConnectorActions.of("4.20.0").multiSlot());
        assertTrue(ConnectorActions.of("4.21.0").multiSlot());
        assertTrue(ConnectorActions.of("4.22.1").multiSlot());
        assertFalse(ConnectorActions.of("4.22.1").bodyEncoding());
        assertTrue(ConnectorActions.of("4.23.0-SNAPSHOT").bodyEncoding());
        assertTrue(ConnectorActions.of("5.0.0").multiSlot());
    }

    @Test
    void actionsWithoutOutput() {
        assertFalse(ConnectorActions.writesOutput("route"));
        assertFalse(ConnectorActions.writesOutput("reset-stats"));
        assertTrue(ConnectorActions.writesOutput("send"));
        assertTrue(ConnectorActions.writesOutput("route-dump"));
    }
}
