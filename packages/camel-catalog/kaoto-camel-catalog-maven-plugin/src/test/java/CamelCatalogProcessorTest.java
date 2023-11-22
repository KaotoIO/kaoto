/*
 * Copyright (C) 2023 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.CamelCatalogProcessor;
import io.kaoto.camelcatalog.CamelYamlDslSchemaProcessor;
import org.apache.camel.dsl.yaml.CamelYamlRoutesBuilderLoader;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

public class CamelCatalogProcessorTest {
    private final ObjectMapper jsonMapper;
    private final CamelCatalogProcessor processor;
    private final ObjectNode yamlDslSchema;
    private final CamelYamlDslSchemaProcessor schemaProcessor;

    public CamelCatalogProcessorTest() throws Exception {
        this.jsonMapper = new ObjectMapper();
        var is = CamelYamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        yamlDslSchema = (ObjectNode) jsonMapper.readTree(is);
        schemaProcessor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
        this.processor = new CamelCatalogProcessor(jsonMapper, schemaProcessor);
    }

    @Test
    public void testProcessCatalog() throws Exception {
        var catalogMap = processor.processCatalog();
        assertEquals(processor.getComponentCatalog(), catalogMap.get("components"));
        assertEquals(processor.getDataFormatCatalog(), catalogMap.get("dataformats"));
        assertEquals(processor.getLanguageCatalog(), catalogMap.get("languages"));
        assertEquals(processor.getModelCatalog(), catalogMap.get("models"));
        assertEquals(processor.getPatternCatalog(), catalogMap.get("patterns"));
    }

    @Test
    public void testGetComponentCatalog() throws Exception {
        var componentCatalog = jsonMapper.readTree(processor.getComponentCatalog());
        assertTrue(componentCatalog.size() > 300);
        var directModel = componentCatalog
                .withObject("/direct")
                .withObject("/component");
        assertEquals("Direct", directModel.get("title").asText());
    }

    @Test
    public void testGetDataFormatCatalog() throws Exception {
        var dataFormatCatalog = jsonMapper.readTree(processor.getDataFormatCatalog());
        var customModel = dataFormatCatalog
                .withObject("/custom")
                .withObject("/model");
        assertEquals("model", customModel.get("kind").asText());
        assertEquals("Custom", customModel.get("title").asText());
        var customProperties = dataFormatCatalog
                .withObject("/custom")
                .withObject("/properties");
        assertEquals("Ref", customProperties.withObject("/ref").get("displayName").asText());
        var customPropertiesSchema = dataFormatCatalog
                .withObject("/custom")
                .withObject("/propertiesSchema");
        assertEquals("Custom", customPropertiesSchema.get("title").asText());
        var refProperty = customPropertiesSchema.withObject("/properties").withObject("/ref");
        assertEquals("Ref", refProperty.get("title").asText());
    }

    @Test
    public void testGetLanguageCatalog() throws Exception {
        var languageCatalog = jsonMapper.readTree(processor.getLanguageCatalog());
        assertFalse(languageCatalog.has("file"));
        var customModel = languageCatalog
                .withObject("/language")
                .withObject("/model");
        assertEquals("model", customModel.get("kind").asText());
        assertEquals("Language", customModel.get("title").asText());
        var customProperties = languageCatalog
                .withObject("/language")
                .withObject("/properties");
        assertEquals("Language", customProperties.withObject("/language").get("displayName").asText());
        var customPropertiesSchema = languageCatalog
                .withObject("/language")
                .withObject("/propertiesSchema");
        assertEquals("Language", customPropertiesSchema.get("title").asText());
        var languageProperty = customPropertiesSchema.withObject("/properties").withObject("/language");
        assertEquals("Language", languageProperty.get("title").asText());
    }

    @Test
    public void testGetModelCatalog() throws Exception {
        var modelCatalog = jsonMapper.readTree(processor.getModelCatalog());
        assertTrue(modelCatalog.size() > 200);
        var aggregateModel = modelCatalog
                .withObject("/aggregate")
                .withObject("/model");
        assertEquals("model", aggregateModel.get("kind").asText());
        assertEquals("Aggregate", aggregateModel.get("title").asText());
    }

    @Test
    public void testGetPatternCatalog() throws Exception {
        var processorCatalog = jsonMapper.readTree(processor.getPatternCatalog());
        assertTrue(processorCatalog.size() > 45 && processorCatalog.size() < 55);
        var choiceModel = processorCatalog.withObject("/choice").withObject("/model");
        assertEquals("choice", choiceModel.get("name").asText());
    }
}
