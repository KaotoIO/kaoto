package io.kaoto.companion.model;

import java.util.Objects;

public record WorkloadSource(String path, SourceFormat format) {
    public WorkloadSource {
        Objects.requireNonNull(path, "path must not be null");
        Objects.requireNonNull(format, "format must not be null");
    }
}
