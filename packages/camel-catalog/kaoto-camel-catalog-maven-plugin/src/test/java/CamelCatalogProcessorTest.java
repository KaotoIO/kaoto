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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CamelCatalogProcessorTest {
    private static final List<String> ALLOWED_ENUM_TYPES = List.of("integer", "number", "string" );
    private final ObjectMapper jsonMapper;
    private final CamelCatalogProcessor processor;
    private final ObjectNode yamlDslSchema;
    private final CamelYamlDslSchemaProcessor schemaProcessor;
    private final ObjectNode componentCatalog;
    private final ObjectNode dataFormatCatalog;
    private final ObjectNode languageCatalog;
    private final ObjectNode modelCatalog;
    private final ObjectNode processorCatalog;

    public CamelCatalogProcessorTest() throws Exception {
        this.jsonMapper = new ObjectMapper();
        var is = CamelYamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        yamlDslSchema = (ObjectNode) jsonMapper.readTree(is);
        schemaProcessor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
        this.processor = new CamelCatalogProcessor(jsonMapper, schemaProcessor);
        this.componentCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getComponentCatalog());
        this.dataFormatCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getDataFormatCatalog());
        this.languageCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getLanguageCatalog());
        this.modelCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getModelCatalog());
        this.processorCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getPatternCatalog());
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
        assertTrue(componentCatalog.size() > 300);
        var directModel = componentCatalog
                .withObject("/direct")
                .withObject("/component");
        assertEquals("Direct", directModel.get("title").asText());
        var as2Schema = componentCatalog
                .withObject("/as2")
                .withObject("/propertiesSchema");
        var as2srmaProperty = as2Schema.withObject("/properties").withObject("/signedReceiptMicAlgorithms");
        assertEquals("array", as2srmaProperty.get("type").asText());
        assertEquals("string", as2srmaProperty.withObject("/items").get("type").asText());
        var gdSchema = componentCatalog
                .withObject("/google-drive")
                .withObject("/propertiesSchema");
        var gdScopesProperty = gdSchema.withObject("/properties").withObject("/scopes");
        assertEquals("array", gdScopesProperty.get("type").asText());
        assertEquals("string", gdScopesProperty.withObject("/items").get("type").asText());
        var gdSPProperty = gdSchema.withObject("/properties").withObject("/schedulerProperties");
        assertEquals("object", gdSPProperty.get("type").asText());
        var sqlSchema = componentCatalog
                .withObject("/sql")
                .withObject("/propertiesSchema");
        var sqlDSProperty = sqlSchema.withObject("/properties").withObject("/dataSource");
        assertEquals("string", sqlDSProperty.get("type").asText());
        assertEquals("class:javax.sql.DataSource", sqlDSProperty.get("$comment").asText());
        var sqlBEHProperty = sqlSchema.withObject("/properties").withObject("/bridgeErrorHandler");
        assertTrue(sqlBEHProperty.get("default").isBoolean());
        assertFalse(sqlBEHProperty.get("default").asBoolean());
        var etcdSchema = componentCatalog
                .withObject("/etcd3")
                .withObject("/propertiesSchema");
        var etcdEProperty = etcdSchema.withObject("/properties").withObject("/endpoints");
        assertEquals("Etcd3Constants.ETCD_DEFAULT_ENDPOINTS", etcdEProperty.withArray("/default").get(0).asText());
    }

    @Test
    public void testComponentEnumParameter() throws Exception {
        for (var entry : componentCatalog.properties()) {
            var name = entry.getKey();
            var component = entry.getValue();
            for (var prop : component.withObject("/propertiesSchema").withObject("/properties").properties()) {
                var propName = prop.getKey();
                var property = prop.getValue();
                if (property.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(property.get("type").asText()), name + ":" + propName);
                }
            }
        }
    }

    @Test
    public void testGetDataFormatCatalog() throws Exception {
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
    public void testDataFormatEnumParameter() throws Exception {
        for (var entry : dataFormatCatalog.properties()) {
            var name = entry.getKey();
            var dataFormat = entry.getValue();
            for (var prop : dataFormat.withObject("/propertiesSchema").withObject("/properties").properties()) {
                var propName = prop.getKey();
                var property = prop.getValue();
                if (property.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(property.get("type").asText()), name + ":" + propName);
                }
            }
        }
    }

    @Test
    public void testGetLanguageCatalog() throws Exception {
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
    public void testLanguageEnumParameter() throws Exception {
        for (var entry : languageCatalog.properties()) {
            var name = entry.getKey();
            var language = entry.getValue();
            for (var prop : language.withObject("/propertiesSchema").withObject("/properties").properties()) {
                var propName = prop.getKey();
                var property = prop.getValue();
                if (property.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(property.get("type").asText()), name + ":" + propName);
                }
            }
        }
    }

    @Test
    public void testGetModelCatalog() throws Exception {
        assertTrue(modelCatalog.size() > 200);
        var aggregateModel = modelCatalog
                .withObject("/aggregate")
                .withObject("/model");
        assertEquals("model", aggregateModel.get("kind").asText());
        assertEquals("Aggregate", aggregateModel.get("title").asText());
    }

    @Test
    public void testGetPatternCatalog() throws Exception {
        assertTrue(processorCatalog.size() > 55 && processorCatalog.size() < 65);
        var choiceModel = processorCatalog.withObject("/choice").withObject("/model");
        assertEquals("choice", choiceModel.get("name").asText());
        var aggregateSchema = processorCatalog.withObject("/aggregate").withObject("/propertiesSchema");
        var aggregationStrategy = aggregateSchema.withObject("/properties").withObject("/aggregationStrategy");
        assertEquals("string", aggregationStrategy.get("type").asText());
        assertEquals("class:org.apache.camel.AggregationStrategy", aggregationStrategy.get("$comment").asText());

        var toDSchema = processorCatalog.withObject("/toD").withObject("/propertiesSchema");
        var uri = toDSchema.withObject("/properties").withObject("/uri");
        assertEquals("string", uri.get("type").asText());
        var parameters = toDSchema.withObject("/properties").withObject("/parameters");
        assertEquals("object", parameters.get("type").asText());
    }

    @Test
    public void testPatternEnumParameter() throws Exception {
        for (var entry : processorCatalog.properties()) {
            var name = entry.getKey();
            var pattern = entry.getValue();
            for (var prop : pattern.withObject("/propertiesSchema").withObject("/properties").properties()) {
                var propName = prop.getKey();
                var property = prop.getValue();
                if (property.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(property.get("type").asText()), name + ":" + propName);
                }
            }
        }
    }
}
