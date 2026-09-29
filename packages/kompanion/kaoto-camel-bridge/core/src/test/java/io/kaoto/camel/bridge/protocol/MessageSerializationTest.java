package io.kaoto.camel.bridge.protocol;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MessageSerializationTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void workerReadyRoundTrips() throws Exception {
        var msg = new OutboundMessage.WorkerReady("exec-1", "4.10.3", "1.0.0-SNAPSHOT");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.worker.ready\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.WorkerReady.class, back);
        assertEquals("exec-1", ((OutboundMessage.WorkerReady) back).executionId());
    }

    @Test
    void routeStartedRoundTrips() throws Exception {
        var msg = new OutboundMessage.RouteStarted("exec-1", "hello-route", "Hello Route");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.route.started\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.RouteStarted.class, back);
        assertEquals("hello-route", ((OutboundMessage.RouteStarted) back).routeId());
    }

    @Test
    void telemetrySnapshotRoundTrips() throws Exception {
        var entry = new OutboundMessage.RouteStats("hello-route", "RUNNING", 5L, 0L, 120L, 3000L);
        var msg = new OutboundMessage.TelemetrySnapshot("exec-1", List.of(entry));
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.telemetry.snapshot\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.TelemetrySnapshot.class, back);
    }

    @Test
    void cmdRouteSuspendRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdRouteSuspend("corr-1", "hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.suspend\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdRouteSuspend.class, back);
        assertEquals("corr-1", ((InboundMessage.CmdRouteSuspend) back).correlationId());
    }

    @Test
    void cmdAckRoundTrips() throws Exception {
        var ack = new OutboundMessage.CmdAck("exec-1", "corr-1", true, null);
        String json = mapper.writeValueAsString(ack);
        assertTrue(json.contains("\"type\":\"camel.cmd.ack\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.CmdAck.class, back);
        assertEquals("corr-1", ((OutboundMessage.CmdAck) back).correlationId());
    }

    @Test
    void cmdExchangeInjectRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdExchangeInject(
                "corr-2", "direct:hello", Map.of("Content-Type", "text/plain"), "hello body", null);
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.exchange.inject\""));
        assertTrue(json.contains("\"endpoint\":\"direct:hello\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdExchangeInject.class, back);
        var backTyped = (InboundMessage.CmdExchangeInject) back;
        assertEquals("corr-2", backTyped.correlationId());
        assertEquals("direct:hello", backTyped.endpoint());
        assertEquals("hello body", backTyped.body());
        assertNull(backTyped.bodyEncoding());
    }

    @Test
    void cmdExchangeInjectBase64RoundTrips() throws Exception {
        String encoded = java.util.Base64.getEncoder().encodeToString(new byte[] {0x00, 0x01, 0x02});
        var cmd = new InboundMessage.CmdExchangeInject("corr-bin", "direct:binary", Map.of(), encoded, "base64");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"bodyEncoding\":\"base64\""));
        var back = (InboundMessage.CmdExchangeInject) mapper.readValue(json, InboundMessage.class);
        assertEquals("base64", back.bodyEncoding());
        assertEquals(encoded, back.body());
    }

    @Test
    void workerStoppingRoundTrips() throws Exception {
        var msg = new OutboundMessage.WorkerStopping("exec-1", "natural");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.worker.stopping\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.WorkerStopping.class, back);
        assertEquals("natural", ((OutboundMessage.WorkerStopping) back).reason());
    }

    @Test
    void exchangeCompletedRoundTrips() throws Exception {
        var msg = new OutboundMessage.ExchangeCompleted(
                "exec-1", "hello-route", "exch-99", 42L, false, Map.of("header1", "value1"), "response body");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.exchange.completed\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.ExchangeCompleted.class, back);
        assertEquals("exch-99", ((OutboundMessage.ExchangeCompleted) back).exchangeId());
    }

    @Test
    void cmdRouteStartRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdRouteStart("corr-1", "hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.start\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdRouteStart.class, back);
        assertEquals("hello-route", ((InboundMessage.CmdRouteStart) back).routeId());
    }

    @Test
    void cmdRouteStopRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdRouteStop("corr-1", "hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.stop\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdRouteStop.class, back);
        assertEquals("hello-route", ((InboundMessage.CmdRouteStop) back).routeId());
    }

    @Test
    void cmdRouteResumeRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdRouteResume("corr-1", "hello-route");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.route.resume\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdRouteResume.class, back);
        assertEquals("corr-1", ((InboundMessage.CmdRouteResume) back).correlationId());
    }

    @Test
    void cmdWorkerStopRoundTrips() throws Exception {
        var cmd = new InboundMessage.CmdWorkerStop("corr-1");
        String json = mapper.writeValueAsString(cmd);
        assertTrue(json.contains("\"type\":\"camel.cmd.worker.stop\""));
        var back = mapper.readValue(json, InboundMessage.class);
        assertInstanceOf(InboundMessage.CmdWorkerStop.class, back);
        assertEquals("corr-1", ((InboundMessage.CmdWorkerStop) back).correlationId());
    }

    @Test
    void routeStoppedRoundTrips() throws Exception {
        var msg = new OutboundMessage.RouteStopped("exec-1", "hello-route");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.route.stopped\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.RouteStopped.class, back);
        assertEquals("hello-route", ((OutboundMessage.RouteStopped) back).routeId());
    }

    @Test
    void routeSuspendedRoundTrips() throws Exception {
        var msg = new OutboundMessage.RouteSuspended("exec-1", "hello-route");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.route.suspended\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.RouteSuspended.class, back);
        assertEquals("hello-route", ((OutboundMessage.RouteSuspended) back).routeId());
    }

    @Test
    void routeResumedRoundTrips() throws Exception {
        var msg = new OutboundMessage.RouteResumed("exec-1", "hello-route");
        String json = mapper.writeValueAsString(msg);
        assertTrue(json.contains("\"type\":\"camel.route.resumed\""));
        var back = mapper.readValue(json, OutboundMessage.class);
        assertInstanceOf(OutboundMessage.RouteResumed.class, back);
        assertEquals("hello-route", ((OutboundMessage.RouteResumed) back).routeId());
    }
}
