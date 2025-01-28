package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.CamelCatalog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class EIPGenerator implements Generator {
    CamelCatalog camelCatalog;
    String camelYamlSchema;
    ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    ObjectNode camelYamlSchemaNode;
    CamelYAMLSchemaReader camelYAMLSchemaReader;

    public EIPGenerator(CamelCatalog camelCatalog, String camelYamlSchema) throws JsonProcessingException {
        this.camelCatalog = camelCatalog;
        this.camelYamlSchema = camelYamlSchema;
        this.camelYamlSchemaNode = (ObjectNode) jsonMapper.readTree(camelYamlSchema);
        this.camelYAMLSchemaReader = new CamelYAMLSchemaReader(camelYamlSchemaNode);
    }

    public Map<String, ObjectNode> generate() {
        Map<String, ObjectNode> eipMap = new LinkedHashMap<>();

        getEIPNames().forEach(eipName -> {
            var eipJSON = getEIPJson(eipName);
            var eipJSONSchema = camelYAMLSchemaReader.getJSONSchema(eipName);

            eipJSON.set("propertiesSchema", eipJSONSchema);

            eipMap.put(eipName, eipJSON);
        });

        return eipMap;
    }

    List<String> getEIPNames() {
        var iterator = this.camelYamlSchemaNode.get("items").get("definitions")
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .fields();

        List<String> eipNames = new ArrayList<>();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            eipNames.add(entry.getKey());
        }

        return eipNames;
    }

    ObjectNode getEIPJson(String eipName) {
        String eipJson = camelCatalog.modelJSonSchema(eipName);

        try {
            return (ObjectNode) jsonMapper.readTree(eipJson);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(String.format("Cannot load %s JSON model", eipName), e);
        }
    }
}
