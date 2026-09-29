package io.kaoto.kompanion.model;

import java.util.Objects;

public record WorkloadSource(String path, SourceFormat format) {
    public WorkloadSource {
        Objects.requireNonNull(path, "path must not be null");
        if (path.isBlank()) {
            throw new IllegalArgumentException("path must not be blank");
        }
        Objects.requireNonNull(format, "format must not be null");
    }
}
