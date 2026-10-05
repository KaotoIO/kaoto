package io.kaoto.kompanion.worker;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.mutiny.helpers.test.AssertSubscriber;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConnectorFrameHandlerTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void slowClientGetsEveryTraceSnapshotAndTheLatestStatus() throws Exception {
        var bus = new ExecutionEventBus();
        bus.bufferSize = 64;
        var handler = new ConnectorFrameHandler();
        handler.eventBus = bus;
        handler.registry = new WorkerRegistry();
        handler.slicer = new SnapshotSlicer();
        handler.slicer.eventBus = bus;
        bus.open("exec-1", "conn-1");
        AssertSubscriber<String> client =
                bus.streamFor("exec-1").subscribe().withSubscriber(AssertSubscriber.create(0));

        // trace snapshots only hold the new messages: one dropped for a newer status was lost for good
        for (int i = 1; i <= 5; i++) {
            handler.onFrame("exec-1", mapper.readTree(snapshot("trace", "{\"traces\":[{\"uid\":" + i + "}]}")));
            handler.onFrame("exec-1", mapper.readTree(snapshot("status", "{\"routes\":[],\"n\":" + i + "}")));
        }
        client.request(100);

        List<Integer> traced = client.getItems().stream()
                .map(this::read)
                .filter(f -> "trace".equals(f.path("kind").asText()))
                .map(f -> f.path("data").path("traces").path(0).path("uid").asInt())
                .toList();
        assertEquals(List.of(1, 2, 3, 4, 5), traced);
        List<Integer> statuses = client.getItems().stream()
                .map(this::read)
                .filter(f -> "status".equals(f.path("kind").asText()))
                .map(f -> f.path("data").path("n").asInt())
                .toList();
        assertEquals(List.of(5), statuses);
    }

    private com.fasterxml.jackson.databind.JsonNode read(String json) {
        try {
            return mapper.readTree(json);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String snapshot(String kind, String data) {
        return "{\"v\":1,\"type\":\"snapshot\",\"kind\":\"" + kind + "\",\"data\":" + data + "}";
    }
}
