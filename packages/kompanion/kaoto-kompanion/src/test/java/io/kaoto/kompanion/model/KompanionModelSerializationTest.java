package io.kaoto.kompanion.model;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class KompanionModelSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void cmdRouteStartRoundTrips() throws Exception {
        var cmd = new KompanionCommand.CmdRouteStart("hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.start\""));
        var back = mapper.readValue(json, KompanionCommand.class);
        assertInstanceOf(KompanionCommand.CmdRouteStart.class, back);
        assertEquals("hello-route", ((KompanionCommand.CmdRouteStart) back).routeId());
    }

    @Test
    void cmdExchangeInjectRoundTrips() throws Exception {
        var cmd = new KompanionCommand.CmdExchangeInject(
                "direct:hello", Map.of("Content-Type", "text/plain"), "hello body", null);
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.exchange.inject\""));
        assertTrue(json.contains("\"endpoint\":\"direct:hello\""));
        var back = mapper.readValue(json, KompanionCommand.class);
        assertInstanceOf(KompanionCommand.CmdExchangeInject.class, back);
        var backTyped = (KompanionCommand.CmdExchangeInject) back;
        assertEquals("direct:hello", backTyped.endpoint());
        assertEquals("hello body", backTyped.body());
        assertNull(backTyped.bodyEncoding());
    }

    @Test
    void cmdExchangeInjectBase64RoundTrips() throws Exception {
        String encoded = java.util.Base64.getEncoder().encodeToString(new byte[] {1, 2, 3});
        var cmd = new KompanionCommand.CmdExchangeInject("direct:bin", Map.of(), encoded, "base64");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"bodyEncoding\":\"base64\""));
        var back = (KompanionCommand.CmdExchangeInject) mapper.readValue(json, KompanionCommand.class);
        assertEquals("base64", back.bodyEncoding());
        assertEquals(encoded, back.body());
    }

    @Test
    void cmdAckRoundTrips() throws Exception {
        var ack = new KompanionEvent.CmdAck("exec-1", "corr-1", true, "done");
        String json = mapper.writeValueAsString(ack);
        assertTrue(json.contains("\"type\":\"camel.cmd.ack\""));
        var back = mapper.readValue(json, KompanionEvent.class);
        assertInstanceOf(KompanionEvent.CmdAck.class, back);
        var backTyped = (KompanionEvent.CmdAck) back;
        assertEquals("exec-1", backTyped.executionId());
        assertEquals("corr-1", backTyped.correlationId());
        assertTrue(backTyped.success());
        assertEquals("done", backTyped.detail());
    }

    @Test
    void telemetrySnapshotRoundTrips() throws Exception {
        var stats = new KompanionEvent.RouteStats("hello-route", "RUNNING", 5L, 0L, 120L, 3000L);
        var snapshot = new KompanionEvent.TelemetrySnapshot("exec-1", List.of(stats));
        String json = mapper.writeValueAsString(snapshot);
        assertTrue(json.contains("\"type\":\"camel.telemetry.snapshot\""));
        var back = mapper.readValue(json, KompanionEvent.class);
        assertInstanceOf(KompanionEvent.TelemetrySnapshot.class, back);
        var backTyped = (KompanionEvent.TelemetrySnapshot) back;
        assertEquals("exec-1", backTyped.executionId());
        assertEquals(1, backTyped.routes().size());
        assertEquals("hello-route", backTyped.routes().get(0).routeId());
    }

    @Test
    void commandResultPendingSerializesCorrectly() throws Exception {
        var result = CommandResult.pending("corr-x");
        String json = mapper.writeValueAsString(result);
        assertTrue(json.contains("\"status\":\"pending\""));
        assertTrue(json.contains("\"success\":false"));
        assertTrue(json.contains("\"correlationId\":\"corr-x\""));
        var back = mapper.readValue(json, CommandResult.class);
        assertEquals("corr-x", back.correlationId());
        assertEquals("pending", back.status());
        assertFalse(back.success());
    }

    @Test
    void commandResultAckedSerializesCorrectly() throws Exception {
        var result = CommandResult.acked("corr-y", true, "ok");
        String json = mapper.writeValueAsString(result);
        assertTrue(json.contains("\"status\":\"acked\""));
        assertTrue(json.contains("\"success\":true"));
        var back = mapper.readValue(json, CommandResult.class);
        assertEquals("corr-y", back.correlationId());
        assertEquals("acked", back.status());
        assertTrue(back.success());
        assertEquals("ok", back.detail());
    }
}
