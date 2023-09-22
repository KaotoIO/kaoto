package io.kaoto.camelcatalog;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.nio.file.Paths;

public class CamelCatalogTestSupport {
    protected static final ObjectMapper jsonMapper = new ObjectMapper();
    protected static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    protected static final JsonFactory jsonFactory = new JsonFactory();

    private static ObjectNode index = null;

    protected ObjectNode getIndex() throws Exception {
        if (CamelCatalogTestSupport.index == null) {
            var path = Paths.get("..").resolve("dist").resolve("index.json");
            CamelCatalogTestSupport.index = (ObjectNode) jsonMapper.readTree(path.toFile());
        }
        return CamelCatalogTestSupport.index;
    }

    protected ObjectNode getSchema(String name) throws Exception {
        var index = getIndex();
        for (JsonNode schema : index.withArray("schemas")) {
            var fileName = schema.get("file").asText();
            var tokens = fileName.split("-");
            if ("camelYamlDsl".equals(tokens[0]) && name.isEmpty() && tokens[1].matches("\\d+.*")) {
                return (ObjectNode) jsonMapper.readTree(Paths.get("..").resolve("dist").resolve(fileName).toFile());
            } else if ("camelYamlDsl".equals(tokens[0]) && tokens[1].equals(name)) {
                return (ObjectNode) jsonMapper.readTree(Paths.get("..").resolve("dist").resolve(fileName).toFile());
            }
        }
        return null;
    }
}
