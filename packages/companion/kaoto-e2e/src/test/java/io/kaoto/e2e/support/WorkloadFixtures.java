package io.kaoto.e2e.support;

import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

public class WorkloadFixtures {

    /** Absolute path to the fixtures directory inside the test resources. */
    public static Path fixturesDir() throws Exception {
        URL resource = WorkloadFixtures.class.getResource("/fixtures");
        if (resource == null) throw new IllegalStateException("fixtures/ not found on classpath");
        return Paths.get(resource.toURI());
    }

    /**
     * Returns the JSON body for a CAMEL workload using the MVP /v1/executions endpoint. Uses workspaceRoot pointing at
     * the fixtures directory.
     */
    public static String camelTimerMvpPayload(String workspaceRoot, String runtimeProfileId) {
        return """
                {
                  "workspaceRoot": "%s",
                  "workload": {
                    "framework": "CAMEL",
                    "runtimeProfileId": "%s",
                    "sources": [
                      { "path": "hello-timer.camel.yaml", "format": "CAMEL_YAML" }
                    ],
                    "beans": [],
                    "propertiesFiles": [],
                    "envFiles": []
                  }
                }
                """.formatted(workspaceRoot, runtimeProfileId);
    }
}
