package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

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
    }

    @Test
    void shouldReturnJSONSchemaForEIP() {
        var eipName = "resequence";
        var eipSchema = camelYAMLSchemaReader.getJSONSchema(eipName);

        assertNotNull(eipSchema);
        assertTrue(eipSchema.has("properties"));
        assertTrue(eipSchema.has("anyOf"));
    }

    @Test
    void shouldInlineDefinitions() {
        var eipSchemaForResequence = camelYAMLSchemaReader.getJSONSchema("resequence");

        assertTrue(eipSchemaForResequence.has("definitions"));
        var definitionsNode = (ObjectNode)  eipSchemaForResequence.get("definitions");

        assertTrue(definitionsNode.has("org.apache.camel.model.config.BatchResequencerConfig"));
        assertTrue(definitionsNode.has("org.apache.camel.model.config.StreamResequencerConfig"));
        assertTrue(definitionsNode.has("org.apache.camel.model.language.ExpressionDefinition"));
        assertTrue(definitionsNode.has("org.apache.camel.model.language.ConstantExpression"));
        assertTrue(definitionsNode.has("org.apache.camel.model.PropertyDefinition"));
    }

    @Test
    void shouldRenameRefPath() {
        var eipSchemaForAggregate = camelYAMLSchemaReader.getJSONSchema("aggregate");

        assertTrue(eipSchemaForAggregate.has("properties"));
        var propertiesNode = (ObjectNode)  eipSchemaForAggregate.get("properties");

        assertTrue(propertiesNode.has("optimisticLockRetryPolicy"));
        var optimisticLockRetryPolicyNode = (ObjectNode)  propertiesNode.get("optimisticLockRetryPolicy");

        assertTrue(optimisticLockRetryPolicyNode.has("$ref"));
        assertEquals("#/definitions/org.apache.camel.model.OptimisticLockRetryPolicyDefinition", optimisticLockRetryPolicyNode.get("$ref").asText());
    }
}