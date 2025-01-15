package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CamelYAMLSchemaReaderTest {
    CamelYAMLSchemaReader camelYAMLSchemaReader;

    @BeforeEach
    void setUp() throws IOException {
        ObjectMapper jsonMapper = new ObjectMapper()
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

        ObjectNode camelYamlSchemaNode;
        try (var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json")) {
            assert is != null;
            var camelYamlSchema = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            camelYamlSchemaNode = (ObjectNode) jsonMapper.readTree(camelYamlSchema);
        }

        camelYAMLSchemaReader = new CamelYAMLSchemaReader(camelYamlSchemaNode);

        var resequenceSchemaNode = (ObjectNode) jsonMapper.readTree(
                getClass().getClassLoader().getResourceAsStream("camel-4.9.0-resequence-schema.json"));
    }

    @Test
    void shouldReturnJSONSchemaForEIP() {
        var eipName = "resequence";
        var eipSchema = camelYAMLSchemaReader.getJSONSchema(eipName);

        assertNotNull(eipSchema);
        assertTrue(eipSchema.has("type"));
        assertTrue(eipSchema.has("properties"));
        assertTrue(eipSchema.has("required"));
    }

    @Test
    void shouldInlineDefinitions() {
        var eipName = "resequence";
        var eipSchema = camelYAMLSchemaReader.getJSONSchema(eipName);

        assertTrue(eipSchema.has("items"));
        var itemsNode = (ObjectNode) eipSchema.get("items");

        assertTrue(itemsNode.has("definitions"));
        var definitionsNode = (ObjectNode)  itemsNode.get("definitions");

        assertTrue(definitionsNode.has("org.apache.camel.model.config.BatchResequencerConfig"));
        assertTrue(definitionsNode.has("org.apache.camel.model.config.StreamResequencerConfig"));
        assertTrue(definitionsNode.has("org.apache.camel.model.language.ExpressionDefinition"));
    }
}