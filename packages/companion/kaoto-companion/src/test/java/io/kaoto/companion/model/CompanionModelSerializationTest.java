package io.kaoto.companion.model;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CompanionModelSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void cmdRouteStartRoundTrips() throws Exception {
        var cmd = new CompanionCommand.CmdRouteStart("hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.start\""));
        var back = mapper.readValue(json, CompanionCommand.class);
        assertInstanceOf(CompanionCommand.CmdRouteStart.class, back);
        assertEquals("hello-route", ((CompanionCommand.CmdRouteStart) back).routeId());
    }

    @Test
    void cmdExchangeInjectRoundTrips() throws Exception {
        var cmd = new CompanionCommand.CmdExchangeInject(
                "direct:hello", Map.of("Content-Type", "text/plain"), "hello body", null);
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.exchange.inject\""));
        assertTrue(json.contains("\"endpoint\":\"direct:hello\""));
        var back = mapper.readValue(json, CompanionCommand.class);
        assertInstanceOf(CompanionCommand.CmdExchangeInject.class, back);
        var backTyped = (CompanionCommand.CmdExchangeInject) back;
        assertEquals("direct:hello", backTyped.endpoint());
        assertEquals("hello body", backTyped.body());
        assertNull(backTyped.bodyEncoding());
    }

    @Test
    void cmdExchangeInjectBase64RoundTrips() throws Exception {
        String encoded = java.util.Base64.getEncoder().encodeToString(new byte[] {1, 2, 3});
        var cmd = new CompanionCommand.CmdExchangeInject("direct:bin", Map.of(), encoded, "base64");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"bodyEncoding\":\"base64\""));
        var back = (CompanionCommand.CmdExchangeInject) mapper.readValue(json, CompanionCommand.class);
        assertEquals("base64", back.bodyEncoding());
        assertEquals(encoded, back.body());
    }

    @Test
    void cmdAckRoundTrips() throws Exception {
        var ack = new CompanionEvent.CmdAck("exec-1", "corr-1", true, "done");
        String json = mapper.writeValueAsString(ack);
        assertTrue(json.contains("\"type\":\"camel.cmd.ack\""));
        var back = mapper.readValue(json, CompanionEvent.class);
        assertInstanceOf(CompanionEvent.CmdAck.class, back);
        var backTyped = (CompanionEvent.CmdAck) back;
        assertEquals("exec-1", backTyped.executionId());
        assertEquals("corr-1", backTyped.correlationId());
        assertTrue(backTyped.success());
        assertEquals("done", backTyped.detail());
    }

    @Test
    void telemetrySnapshotRoundTrips() throws Exception {
        var stats = new CompanionEvent.RouteStats("hello-route", "RUNNING", 5L, 0L, 120L, 3000L);
        var snapshot = new CompanionEvent.TelemetrySnapshot("exec-1", List.of(stats));
        String json = mapper.writeValueAsString(snapshot);
        assertTrue(json.contains("\"type\":\"camel.telemetry.snapshot\""));
        var back = mapper.readValue(json, CompanionEvent.class);
        assertInstanceOf(CompanionEvent.TelemetrySnapshot.class, back);
        var backTyped = (CompanionEvent.TelemetrySnapshot) back;
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
