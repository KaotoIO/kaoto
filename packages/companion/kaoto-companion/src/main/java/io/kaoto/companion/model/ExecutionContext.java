package io.kaoto.companion.model;

import java.util.Objects;

public record ExecutionContext(String workspaceRoot, WorkloadSpec workload) {
    public ExecutionContext {
        Objects.requireNonNull(workspaceRoot, "workspaceRoot must not be null");
        if (workspaceRoot.isBlank()) {
            throw new IllegalArgumentException("workspaceRoot must not be blank");
        }
        Objects.requireNonNull(workload, "workload must not be null");
    }
}
