package io.kaoto.companion.model;

import java.util.List;
import java.util.Objects;

public record WorkloadSpec(
        Framework framework,
        String runtimeProfileId,
        List<WorkloadSource> sources,
        List<String> beans,
        List<String> propertiesFiles,
        List<String> envFiles) {

    public WorkloadSpec {
        Objects.requireNonNull(framework, "framework must not be null");
        Objects.requireNonNull(runtimeProfileId, "runtimeProfileId must not be null");
        if (runtimeProfileId.isBlank()) {
            throw new IllegalArgumentException("runtimeProfileId must not be blank");
        }
        Objects.requireNonNull(sources, "sources must not be null");
        if (sources.isEmpty()) {
            throw new IllegalArgumentException("sources must not be empty");
        }
    }
}
