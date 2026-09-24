package io.kaoto.camel.bridge.transport;

/**
 * Parsed companion address. Owns URI assembly so neither {@code KaotoCamelBridge} nor {@code WorkerWebSocketClient}
 * deals with string manipulation.
 */
public record CompanionAddress(String host, int port, String executionId) {

    private static final String WORKER_PATH = "/v1/worker/connect";

    /**
     * Parses {@code "host:port"} and pairs it with the execution ID.
     *
     * @throws IllegalArgumentException if the input is malformed or either value is blank
     */
    public static CompanionAddress parse(String hostPort, String executionId) {
        if (hostPort == null || hostPort.isBlank()) {
            throw new IllegalArgumentException(
                    "kaoto.companion.address must be in host:port format, got: '" + hostPort + "'");
        }
        int colon = hostPort.lastIndexOf(':');
        if (colon <= 0 || colon == hostPort.length() - 1) {
            throw new IllegalArgumentException(
                    "kaoto.companion.address must be in host:port format, got: '" + hostPort + "'");
        }
        int port;
        try {
            port = Integer.parseInt(hostPort.substring(colon + 1));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("kaoto.companion.address port is not a number in: '" + hostPort + "'");
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("kaoto.companion.address port must be 1–65535, got: " + port);
        }
        if (executionId == null || executionId.isBlank()) {
            throw new IllegalArgumentException("kaoto.companion.execution-id must not be blank");
        }
        return new CompanionAddress(hostPort.substring(0, colon), port, executionId);
    }

    /** Returns the full WebSocket URI for this companion address. */
    public String toUri() {
        return "ws://" + host + ":" + port + WORKER_PATH + "?executionId=" + executionId;
    }
}
