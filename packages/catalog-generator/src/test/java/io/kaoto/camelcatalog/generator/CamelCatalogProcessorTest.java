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
package io.kaoto.camelcatalog.generator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.model.CatalogRuntime;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CamelCatalogProcessorTest {
    private static final List<String> ALLOWED_ENUM_TYPES = List.of("integer", "number", "string");
    private final CamelCatalogProcessor processor;
    private final ObjectNode componentCatalog;
    private final ObjectNode dataFormatCatalog;
    private final ObjectNode languageCatalog;
    private final ObjectNode modelCatalog;
    private final ObjectNode processorCatalog;
    private final ObjectNode entityCatalog;
    private final ObjectNode loadBalancerCatalog;

    CamelCatalogProcessorTest() throws Exception {
        CamelCatalog catalog = new DefaultCamelCatalog();
        ObjectMapper jsonMapper = new ObjectMapper();
        var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        ObjectNode yamlDslSchema = (ObjectNode) jsonMapper.readTree(is);
        CamelYamlDslSchemaProcessor schemaProcessor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);

        this.processor = new CamelCatalogProcessor(catalog, jsonMapper, schemaProcessor, CatalogRuntime.Main, true);

        this.componentCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getComponentCatalog());
        this.dataFormatCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getDataFormatCatalog());
        this.languageCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getLanguageCatalog());
        this.modelCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getModelCatalog());
        this.processorCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getPatternCatalog());
        this.entityCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getEntityCatalog());
        this.loadBalancerCatalog = (ObjectNode) jsonMapper.readTree(this.processor.getLoadBalancerCatalog());
    }

    @Test
    void testProcessCatalog() throws Exception {
        var catalogMap = processor.processCatalog();
        assertEquals(processor.getComponentCatalog(), catalogMap.get("components"));
        assertEquals(processor.getDataFormatCatalog(), catalogMap.get("dataformats"));
        assertEquals(processor.getLanguageCatalog(), catalogMap.get("languages"));
        assertEquals(processor.getModelCatalog(), catalogMap.get("models"));
        assertEquals(processor.getPatternCatalog(), catalogMap.get("patterns"));
        assertEquals(processor.getEntityCatalog(), catalogMap.get("entities"));
        assertEquals(processor.getLoadBalancerCatalog(), catalogMap.get("loadbalancers"));
    }

    @Test
    void testGetComponentCatalog() throws Exception {
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
        assertEquals("http://localhost:2379", etcdEProperty.get("default").asText());

        var smbSchema = componentCatalog
                .withObject("/smb")
                .withObject("/propertiesSchema");
        var smbUsernameProperty = smbSchema.withObject("/properties").withObject("/username");
        assertEquals("password", smbUsernameProperty.get("format").asText());
        var smbPasswordProperty = smbSchema.withObject("/properties").withObject("/password");
        assertEquals("password", smbPasswordProperty.get("format").asText());

        var cxfSchema = componentCatalog
                .withObject("/cxf")
                .withObject("/propertiesSchema");
        var cxfContinuationTimeout = cxfSchema.withObject("/properties").withObject("/continuationTimeout");
        assertEquals("duration", cxfContinuationTimeout.get("format").asText());
    }

    @Test
    void testComponentEnumParameter() throws Exception {
        checkEnumParameters(componentCatalog);
    }

    private void checkEnumParameters(ObjectNode catalog) throws Exception {
        for (var entry : catalog.properties()) {
            var name = entry.getKey();
            var component = entry.getValue();
            for (var prop : component.withObject("/propertiesSchema").withObject("/properties").properties()) {
                var propName = prop.getKey();
                var property = prop.getValue();
                if (property.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(property.get("type").asText()), name + ":" + propName);
                    checkEnumDuplicate(name, propName, property.withArray("/enum"));
                }
            }
        }
    }

    private void checkEnumDuplicate(String entityName, String propertyName, ArrayNode enumArray) {
        Set<String> names = new HashSet<>();
        for (var enumValue : enumArray) {
            var name = enumValue.asText();
            if (names.contains(name)) {
                fail(String.format("Duplicate enum value [%s] in [%s/%s]", name, entityName, propertyName));
            }
            names.add(name);
        }
    }

    @Test
    void testGetDataFormatCatalog() throws Exception {
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
        var customPropertiesSchemaRequiredFields = customPropertiesSchema.withArray("/required");
        assertFalse(customPropertiesSchemaRequiredFields.isEmpty());
        assertEquals(1, customPropertiesSchemaRequiredFields.size(), "Size should be 1");
    }

    @Test
    void testDataFormatEnumParameter() throws Exception {
        checkEnumParameters(dataFormatCatalog);
    }

    @Test
    void testGetLanguageCatalog() throws Exception {
        assertFalse(languageCatalog.has("file"));
        var languageModel = languageCatalog
                .withObject("/language")
                .withObject("/model");
        assertEquals("model", languageModel.get("kind").asText());
        assertEquals("Language", languageModel.get("title").asText());
        var languageProperties = languageCatalog
                .withObject("/language")
                .withObject("/properties");
        assertEquals("Language", languageProperties.withObject("/language").get("displayName").asText());
        var languagePropertiesSchema = languageCatalog
                .withObject("/language")
                .withObject("/propertiesSchema");
        assertEquals("Language", languagePropertiesSchema.get("title").asText());
        var languageProperty = languagePropertiesSchema.withObject("/properties").withObject("/language");
        assertEquals("Language", languageProperty.get("title").asText());
        var languagePropertiesSchemaRequiredFields = languagePropertiesSchema.withArray("/required");
        assertFalse(languagePropertiesSchemaRequiredFields.isEmpty());
        assertEquals(2, languagePropertiesSchemaRequiredFields.size(), "Size should be 2");
        assertEquals("expression", languagePropertiesSchemaRequiredFields.get(0).asText());
        assertEquals("language", languagePropertiesSchemaRequiredFields.get(1).asText());
    }

    @Test
    void testLanguageEnumParameter() throws Exception {
        checkEnumParameters(languageCatalog);
    }

    @Test
    void testGetModelCatalog() throws Exception {
        assertTrue(modelCatalog.size() > 200);
        var aggregateModel = modelCatalog
                .withObject("/aggregate")
                .withObject("/model");
        assertEquals("model", aggregateModel.get("kind").asText());
        assertEquals("Aggregate", aggregateModel.get("title").asText());
    }

    @Test
    void testModelEnumParameter() throws Exception {
        checkEnumParameters(modelCatalog);
    }

    @Test
    void testGetPatternCatalog() throws Exception {
        assertTrue(processorCatalog.size() > 65 && processorCatalog.size() < 80);
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
    void testRouteConfigurationCatalog() throws Exception {
        List.of("intercept", "interceptFrom", "interceptSendToEndpoint", "onCompletion", "onException")
                .forEach(name -> assertTrue(entityCatalog.has(name), name));
    }

    @Test
    void testPatternEnumParameter() throws Exception {
        checkEnumParameters(processorCatalog);
    }

    @Test
    void testGetEntityCatalog() throws Exception {
        List.of(
                "bean",
                "beans",
                "errorHandler",
                "from",
                "intercept",
                "interceptFrom",
                "interceptSendToEndpoint",
                "onCompletion",
                "onException",
                "routeConfiguration",
                "route",
                "routeTemplate",
                "templatedRoute",
                "restConfiguration",
                "rest",
                "routeTemplateBean").forEach(name -> assertTrue(entityCatalog.has(name), name));
        var bean = entityCatalog.withObject("/bean");
        var beanScriptLanguage = bean.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/scriptLanguage");
        assertEquals("Script Language", beanScriptLanguage.get("title").asText());
        var beans = entityCatalog.withObject("/beans");
        var beansScript = beans.withObject("/propertiesSchema")
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.BeanFactoryDefinition")
                .withObject("/properties")
                .withObject("/script");
        assertEquals("Script", beansScript.get("title").asText());
        var routeTemplateBean = entityCatalog.withObject("/routeTemplateBean");
        var routeTemplateBeanType = routeTemplateBean.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/type");
        assertEquals("Type", routeTemplateBeanType.get("title").asText());
    }

    @Test
    void testEntityEnumParameter() throws Exception {
        checkEnumParameters(entityCatalog);
    }

    @Test
    void testGetLoadBalancerCatalog() throws Exception {
        assertFalse(loadBalancerCatalog.isEmpty());
        var failoverModel = loadBalancerCatalog.withObject("/failoverLoadBalancer/model");
        assertEquals("failoverLoadBalancer", failoverModel.get("name").asText());
        var failoverSchema = loadBalancerCatalog.withObject("/failoverLoadBalancer/propertiesSchema");
        var failoverSchemaRequiredFields = failoverSchema.withArray("/required");
        assertTrue(failoverSchemaRequiredFields.isEmpty());
        var maximumFailoverAttempts = failoverSchema.withObject("/properties/maximumFailoverAttempts");
        assertEquals("string", maximumFailoverAttempts.get("type").asText());
        assertEquals("-1", maximumFailoverAttempts.get("default").asText());

        var roundRobinSchema = loadBalancerCatalog.withObject("/roundRobinLoadBalancer/propertiesSchema");
        var roundRobinSchemaRequiredFields = roundRobinSchema.withArray("/required");
        assertTrue(roundRobinSchemaRequiredFields.isEmpty());
        var roundRobinId = roundRobinSchema.withObject("/properties/id");
        assertEquals("string", roundRobinId.get("type").asText());

        var customModel = loadBalancerCatalog.withObject("/customLoadBalancer/model");
        assertEquals("Custom Load Balancer", customModel.get("title").asText());
        var customSchema = loadBalancerCatalog.withObject("/customLoadBalancer/propertiesSchema");
        var customSchemaRequiredFields = customSchema.withArray("/required");
        assertFalse(customSchemaRequiredFields.isEmpty());
        assertEquals(1, customSchemaRequiredFields.size(), "Size should be 1");
        assertEquals("ref", customSchemaRequiredFields.get(0).asText());
        assertEquals("Custom Load Balancer", customSchema.get("title").asText());
        var customRef = customSchema.withObject("/properties/ref");
        assertEquals("Ref", customRef.get("title").asText());
    }

    @Test
    void testLoadBalancerEnumParameter() throws Exception {
        checkEnumParameters(loadBalancerCatalog);
    }
}
