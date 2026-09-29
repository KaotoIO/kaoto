package io.kaoto.e2e.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

public class WorkloadFixtures {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Absolute path to the fixtures directory inside the test resources. */
    public static Path fixturesDir() throws Exception {
        URL resource = WorkloadFixtures.class.getResource("/fixtures");
        if (resource == null) throw new IllegalStateException("fixtures/ not found on classpath");
        return Paths.get(resource.toURI());
    }

    /**
     * Returns the JSON body for a CAMEL workload using the MVP /v1/executions endpoint. Uses workspaceRoot pointing at
     * the fixtures directory. Both string values are serialized through Jackson to handle backslashes on Windows.
     */
    public static String camelTimerMvpPayload(String workspaceRoot, String runtimeProfileId) throws Exception {
        ObjectNode root = MAPPER.createObjectNode();
        root.put("workspaceRoot", workspaceRoot);
        ObjectNode workload = root.putObject("workload");
        workload.put("framework", "CAMEL");
        workload.put("runtimeProfileId", runtimeProfileId);
        workload.putArray("sources")
                .addObject()
                .put("path", "hello-timer.camel.yaml")
                .put("format", "CAMEL_YAML");
        workload.putArray("beans");
        workload.putArray("propertiesFiles");
        workload.putArray("envFiles");
        return MAPPER.writeValueAsString(root);
    }
}
