package io.kaoto.companion.model;

/** Response body for a completed or pending command. */
public record CommandResult(
        String correlationId,
        String status, // "acked", "failed", "pending"
        boolean success,
        String detail) {

    public static CommandResult pending(String correlationId) {
        return new CommandResult(correlationId, "pending", false, null);
    }

    public static CommandResult acked(String correlationId, boolean success, String detail) {
        return new CommandResult(correlationId, success ? "acked" : "failed", success, detail);
    }
}
