package io.kaoto.kompanion.model;

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
        for (int i = 0; i < sources.size(); i++) {
            WorkloadSource src = sources.get(i);
            if (src == null) {
                throw new IllegalArgumentException("sources[" + i + "] must not be null");
            }
            boolean camelFormat = src.format() == SourceFormat.CAMEL_YAML || src.format() == SourceFormat.CAMEL_XML;
            boolean citrusFormat = src.format() == SourceFormat.CITRUS_YAML;
            if (framework == Framework.CAMEL && !camelFormat) {
                throw new IllegalArgumentException(
                        "sources[" + i + "] format " + src.format() + " is not compatible with framework CAMEL");
            }
            if (framework == Framework.CITRUS && !citrusFormat) {
                throw new IllegalArgumentException(
                        "sources[" + i + "] format " + src.format() + " is not compatible with framework CITRUS");
            }
        }
    }
}
