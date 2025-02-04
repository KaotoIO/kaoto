/*
 * Copyright (C) 2025 Red Hat, Inc.
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
package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.Kind;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CamelCatalogSchemaEnhancerTest {
    private CamelCatalog camelCatalog;
    private CamelCatalogSchemaEnhancer camelCatalogSchemaEnhancer;
    private ObjectMapper jsonMapper;
    private ObjectNode camelYamlDslSchema;

    @BeforeEach
    void setUp() throws Exception {
        camelCatalog = new DefaultCamelCatalog();
        camelCatalogSchemaEnhancer = new CamelCatalogSchemaEnhancer(camelCatalog);

        var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        jsonMapper = new ObjectMapper();
        camelYamlDslSchema = (ObjectNode) jsonMapper.readTree(is);
    }

    @Test
    void shouldFillSchemaInformation() {
        var setHeaderNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.SetHeaderDefinition").deepCopy();

        camelCatalogSchemaEnhancer.fillSchemaInformation(setHeaderNode);

        assertTrue(setHeaderNode.has("$schema"));
        assertTrue(setHeaderNode.has("type"));
        assertEquals("http://json-schema.org/draft-07/schema#", setHeaderNode.get("$schema").asText());
        assertEquals("object", setHeaderNode.get("type").asText());
    }

    @Test
    void shouldFillRequiredPropertiesIfNeededForModelName() {
        var setHeaderNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.SetHeaderDefinition").deepCopy();

        // remove required property to simulate the case where it is not present
        setHeaderNode.remove("required");

        camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(Kind.eip, "setHeader", setHeaderNode);

        assertTrue(setHeaderNode.has("required"));
        assertEquals(2, setHeaderNode.get("required").size());

        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("name"));
        assertTrue(requiredProperties.contains("expression"));
    }

    @Test
    void shouldFillRequiredPropertiesIfNeededForModel() {
        var setHeaderNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.SetHeaderDefinition").deepCopy();

        // remove required property to simulate the case where it is not present
        setHeaderNode.remove("required");

        EipModel model = camelCatalog.eipModel("setHeader");
        camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(model, setHeaderNode);

        assertTrue(setHeaderNode.has("required"));
        assertEquals(2, setHeaderNode.get("required").size());

        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("name"));
        assertTrue(requiredProperties.contains("expression"));
    }

    @Test
    void shouldFillGroupInformationForModelName() {
        var choiceNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.ChoiceDefinition");

        EipModel model = camelCatalog.eipModel("choice");
        camelCatalogSchemaEnhancer.fillPropertiesInformation(model, choiceNode);

        var idPropertyNode = choiceNode.withObject("properties").withObject("id");
        var preconditionPropertyNode = choiceNode.withObject("properties").withObject("precondition");

        assertTrue(idPropertyNode.has("$comment"));
        assertTrue(preconditionPropertyNode.has("$comment"));
        assertEquals("group:common", idPropertyNode.get("$comment").asText());
        assertEquals("group:advanced", preconditionPropertyNode.get("$comment").asText());
    }

    @Test
    void shouldFillGroupInformationForModel() {
        var setHeaderNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.SetHeaderDefinition");

        camelCatalogSchemaEnhancer.fillPropertiesInformation("setHeader", setHeaderNode);

        var expressionPropertyNode = setHeaderNode.withObject("properties").withObject("expression");
        var idPropertyNode = setHeaderNode.withObject("properties").withObject("id");
        var disabledPropertyNode = setHeaderNode.withObject("properties").withObject("disabled");

        assertFalse(expressionPropertyNode.has("$comment"));
        assertTrue(idPropertyNode.has("$comment"));
        assertTrue(disabledPropertyNode.has("$comment"));
        assertEquals("group:common", idPropertyNode.get("$comment").asText());
        assertEquals("group:advanced", disabledPropertyNode.get("$comment").asText());
    }

    @Test
    void shouldFillFormatInformationForModelName() {
        var aggregateNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.AggregateDefinition");

        EipModel model = camelCatalog.eipModel("aggregate");
        camelCatalogSchemaEnhancer.fillPropertiesInformation(model, aggregateNode);

        var executorServicePropertyNode = aggregateNode.withObject("properties")
                .withObject("executorService");
        var timeoutCheckerExecutorServicePropertyNode = aggregateNode.withObject("properties")
                .withObject("timeoutCheckerExecutorService");

        assertTrue(executorServicePropertyNode.has("format"));
        assertTrue(timeoutCheckerExecutorServicePropertyNode.has("format"));
        assertEquals("bean:java.util.concurrent.ExecutorService", executorServicePropertyNode.get("format").asText());
        assertEquals("bean:java.util.concurrent.ScheduledExecutorService",
                timeoutCheckerExecutorServicePropertyNode.get("format").asText());
    }

    @Test
    void shouldFillFormatInformationForModel() {
        var aggregateNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.AggregateDefinition");

        camelCatalogSchemaEnhancer.fillPropertiesInformation("aggregate", aggregateNode);

        var executorServicePropertyNode = aggregateNode.withObject("properties")
                .withObject("executorService");
        var timeoutCheckerExecutorServicePropertyNode = aggregateNode.withObject("properties")
                .withObject("timeoutCheckerExecutorService");

        assertTrue(executorServicePropertyNode.has("format"));
        assertTrue(timeoutCheckerExecutorServicePropertyNode.has("format"));
        assertEquals("bean:java.util.concurrent.ExecutorService", executorServicePropertyNode.get("format").asText());
        assertEquals("bean:java.util.concurrent.ScheduledExecutorService",
                timeoutCheckerExecutorServicePropertyNode.get("format").asText());
    }

    @Test
    void shouldFillDeprecatedInformationForEIPModel() {
        var recipientListNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.RecipientListDefinition");

        camelCatalogSchemaEnhancer.fillPropertiesInformation("RecipientList", recipientListNode);

        var parallelAggregateNode = recipientListNode.withObject("properties").withObject("parallelAggregate");

        assertTrue(parallelAggregateNode.has("deprecated"));
        assertTrue(parallelAggregateNode.get("deprecated").asBoolean());
    }

    @Test
    void shouldFillDefaultInformationForEIPModel() {
        var multicastNode = camelYamlDslSchema
                .withObject("items")
                .withObject("definitions")
                .withObject("org.apache.camel.model.MulticastDefinition");

        camelCatalogSchemaEnhancer.fillPropertiesInformation("multicast", multicastNode);

        var timeoutNode = multicastNode.withObject("properties").withObject("timeout");

        assertTrue(timeoutNode.has("default"));
        assertEquals("0", timeoutNode.get("default").asText());
    }

    @Test
    void shouldSortPropertiesAccordingToCatalogForModelName() {
        var choiceNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.ChoiceDefinition").deepCopy();

        camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog("choice", choiceNode);

        assertTrue(choiceNode.has("properties"));
        List<String> actualKeys = choiceNode.withObject("/properties").properties().stream()
                .map(Map.Entry::getKey).toList();
        assertEquals(List.of("id", "description", "disabled", "when", "otherwise", "precondition"), actualKeys);
    }

    @Test
    void shouldSortPropertiesAccordingToCatalogForModel() {
        var choiceNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.ChoiceDefinition").deepCopy();

        EipModel model = camelCatalog.eipModel("choice");
        camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(model, choiceNode);

        assertTrue(choiceNode.has("properties"));
        List<String> actualKeys = choiceNode.withObject("/properties").properties().stream()
                .map(Map.Entry::getKey).toList();
        assertEquals(List.of("id", "description", "disabled", "when", "otherwise", "precondition"), actualKeys);
    }

    @Test
    void shouldGetCamelModelByJavaType() {
        EipModel setHeaderModel =
                camelCatalogSchemaEnhancer.getCamelModelByJavaType("org.apache.camel.model.SetHeaderDefinition");

        assertNotNull(setHeaderModel);
        assertEquals("setHeader", setHeaderModel.getName());
        assertFalse(setHeaderModel.getOptions().isEmpty());
    }
}
