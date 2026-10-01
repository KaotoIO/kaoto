package io.kaoto.kompanion.worker;

import com.fasterxml.jackson.databind.JsonNode;

/** Wire protocol spoken by a connected worker. Detected from the first frame the worker sends. */
public enum WorkerProtocol {
    /** The Kaoto bridge agent (kaoto-camel-bridge): camel.* frames. */
    BRIDGE,
    /** Apache Camel's camel-cli-connector WebSocket transport: versioned {"v":1,"type":...} envelope. */
    CONNECTOR;

    /** Detects the protocol from the first frame, or returns null when the frame is not recognized. */
    public static WorkerProtocol detect(JsonNode firstFrame) {
        if (firstFrame.hasNonNull("v") && "hello".equals(firstFrame.path("type").asText())) {
            return CONNECTOR;
        }
        if (firstFrame.path("type").asText().startsWith("camel.")) {
            return BRIDGE;
        }
        return null;
    }
}
