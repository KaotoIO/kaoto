package io.kaoto.camelcatalog;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CamelYamlDslSchemaTest extends CamelCatalogTestSupport {

    @Test
    public void testRootSchema() throws Exception {
        var rootSchema = getSchema("camelYamlDsl");
        assertEquals(rootSchema.get("type").asText(), "array");
        var definitions = rootSchema.withObject("/items").withObject("/definitions");
        assertTrue(definitions.has("org.apache.camel.model.ProcessorDefinition"));
    }

    @Test
    public void testBeans() throws Exception {
        var beansSchema = getSchema("beans");
        assertEquals(beansSchema.get("type").asText(), "array");
        var definitions = beansSchema.withObject("/definitions");
        assertEquals(1, definitions.size());
        assertTrue(definitions.has("org.apache.camel.model.app.RegistryBeanDefinition"));
    }
}
