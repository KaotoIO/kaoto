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

import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EIPGeneratorTest {
    EIPGenerator eipGenerator;

    @BeforeEach
    void setUp() throws IOException {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        String camelYamlSchema;
        try (var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json")) {
            assert is != null;
            camelYamlSchema = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        eipGenerator = new EIPGenerator(camelCatalog, camelYamlSchema);
    }

    @Test
    void shouldContainAListOfProcessors() {
        var processorsMap = eipGenerator.generate();

        assertTrue(processorsMap.containsKey("aggregate"));
        assertTrue(processorsMap.containsKey("to"));
        assertTrue(processorsMap.containsKey("setHeader"));
        assertTrue(processorsMap.containsKey("setHeaders"));

        assertTrue(processorsMap.containsKey("choice"));
        assertTrue(processorsMap.containsKey("doTry"));

        /* These are special cases, while they are processors, they cannot be used directly */
        assertTrue(processorsMap.containsKey("when"));
        assertTrue(processorsMap.containsKey("otherwise"));
        assertTrue(processorsMap.containsKey("doCatch"));
        assertTrue(processorsMap.containsKey("doFinally"));

        /* These are REST processors */
        assertTrue(processorsMap.containsKey("get"));
        assertTrue(processorsMap.containsKey("post"));
        assertTrue(processorsMap.containsKey("put"));
        assertTrue(processorsMap.containsKey("delete"));
        assertTrue(processorsMap.containsKey("head"));
        assertTrue(processorsMap.containsKey("patch"));
    }

    @Test
    void shouldGetProcessorNames() {
        var processorList = eipGenerator.getEIPNames();

        assertTrue(processorList.containsAll(List.of("filter", "multicast", "when", "doCatch", "log", "aggregate")));
    }

    @Test
    void shouldGetModelJson() {
        var postJson = eipGenerator.getModelJson("post");

        assertFalse(postJson.isEmpty());
        assertTrue(postJson.has("model"));
        assertTrue(postJson.has("properties"));
        assertFalse(postJson.has("propertiesSchema"));
    }

    @Test
    void shouldGetJsonSchemaForBeanProcessor() {
        var processorsMap = eipGenerator.generate();

        var beanNode = processorsMap.get("bean");
        assertTrue(beanNode.has("propertiesSchema"));

        var beanPropertySchemaNode = beanNode.get("propertiesSchema");
        assertFalse(beanPropertySchemaNode.has("definitions"));
        assertTrue(beanPropertySchemaNode.has("title"));
        assertTrue(beanPropertySchemaNode.has("description"));
        assertTrue(beanPropertySchemaNode.has("properties"));
    }

    @Test
    void shouldGetJsonSchemaForRESTGetProcessor() {
        var processorsMap = eipGenerator.generate();

        var getNode = processorsMap.get("get");
        assertTrue(getNode.has("propertiesSchema"));

        var getPropertySchemaNode = getNode.get("propertiesSchema");
        assertTrue(getPropertySchemaNode.has("definitions"));
        assertTrue(getPropertySchemaNode.has("title"));
        assertTrue(getPropertySchemaNode.has("description"));
        assertTrue(getPropertySchemaNode.has("properties"));
    }

    @Test
    void shouldFillSchemaInformation() {
        var processorsMap = eipGenerator.generate();

        var setHeaderPropertySchemaNode = processorsMap.get("setHeader").withObject("propertiesSchema");
        assertTrue(setHeaderPropertySchemaNode.has("$schema"));
        assertTrue(setHeaderPropertySchemaNode.has("type"));
        assertEquals("http://json-schema.org/draft-07/schema#", setHeaderPropertySchemaNode.get("$schema").asText());
        assertEquals("object", setHeaderPropertySchemaNode.get("type").asText());
    }

    @Test
    void shouldFillRequiredPropertiesIfNeeded() {
        var processorsMap = eipGenerator.generate();

        var setHeaderNode = processorsMap.get("setHeader");
        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withObject("propertiesSchema").withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("name"));
        assertTrue(requiredProperties.contains("expression"));

        var deleteNode = processorsMap.get("delete");

        assertFalse(deleteNode.withObject("propertiesSchema").has("required"));
    }

    @Test
    void shouldSortPropertiesAccordingToCatalog() {
        var processorsMap = eipGenerator.generate();

        var setHeaderNode = processorsMap.get("setHeader");
        List<String> expectedKeys = List.of("id", "description", "disabled", "name", "expression");
        List<String> actualKeys = setHeaderNode.withObject("/properties").properties().stream()
                .map(Map.Entry::getKey).toList();

        assertEquals(expectedKeys, actualKeys);
    }

    @Test
    void shouldFillRequiredPropertiesFromDefinitionsIfNeeded() {
        var processorsMap = eipGenerator.generate();

        var definitions = processorsMap.get("setHeader").withObject("propertiesSchema").withObject("definitions");
        assertTrue(definitions.has("org.apache.camel.model.language.ConstantExpression"));
        assertTrue(definitions.withObject("org.apache.camel.model.language.ConstantExpression").has("required"));
        List<String> constantExpressionRequired = new ArrayList<>();
        definitions.get("org.apache.camel.model.language.ConstantExpression").withArray("required").elements()
                .forEachRemaining(item -> constantExpressionRequired.add(item.asText()));
        assertTrue(constantExpressionRequired.contains("expression"));

        assertTrue(definitions.has("org.apache.camel.model.language.SimpleExpression"));
        assertTrue(definitions.withObject("org.apache.camel.model.language.SimpleExpression").has("required"));
        List<String> simpleExpressionRequired = new ArrayList<>();
        definitions.get("org.apache.camel.model.language.SimpleExpression").withArray("required").elements()
                .forEachRemaining(item -> simpleExpressionRequired.add(item.asText()));
        assertTrue(simpleExpressionRequired.contains("expression"));
    }

    @Test
    void shouldFillGroupInformation() {
        var processorsMap = eipGenerator.generate();

        var setHeaderNode = processorsMap.get("setHeader");
        var namePropertyNode = setHeaderNode.withObject("propertiesSchema").withObject("properties").withObject("name");

        assertTrue(namePropertyNode.has("$comment"));
        assertEquals("group:common", namePropertyNode.get("$comment").asText());
    }

    @Test
    void shouldFillFormatInformation() {
        var processorsMap = eipGenerator.generate();

        var aggregateNode = processorsMap.get("aggregate");
        var executorServicePropertyNode = aggregateNode.withObject("propertiesSchema")
                .withObject("properties").withObject("executorService");
        var timeoutCheckerExecutorServicePropertyNode = aggregateNode.withObject("propertiesSchema")
                .withObject("properties").withObject("timeoutCheckerExecutorService");

        assertTrue(executorServicePropertyNode.has("format"));
        assertTrue(timeoutCheckerExecutorServicePropertyNode.has("format"));
        assertEquals("bean:java.util.concurrent.ExecutorService", executorServicePropertyNode.get("format").asText());
        assertEquals("bean:java.util.concurrent.ScheduledExecutorService",
                timeoutCheckerExecutorServicePropertyNode.get("format").asText());
    }

    @Test
    void shouldFillDeprecatedInformation() {
        var processorsMap = eipGenerator.generate();

        var multicastNode = processorsMap.get("multicast");
        var parallelAggregatePropertyNode = multicastNode.withObject("propertiesSchema")
                .withObject("properties").withObject("parallelAggregate");

        assertTrue(parallelAggregatePropertyNode.has("deprecated"));
        assertTrue(parallelAggregatePropertyNode.get("deprecated").asBoolean());
    }

    @Test
    void shouldFillGroupInformationFromDefinitions() {
        var processorsMap = eipGenerator.generate();

        var setHeaderNode = processorsMap.get("setHeader");
        var expressionPropertiesNode = setHeaderNode.withObject("propertiesSchema").withObject("definitions")
                .withObject("org.apache.camel.model.language.SimpleExpression").withObject("properties");

        var expressionPropertyNode = expressionPropertiesNode.withObject("expression");
        var trimPropertyNode = expressionPropertiesNode.withObject("trim");

        assertTrue(expressionPropertyNode.has("$comment"));
        assertTrue(trimPropertyNode.has("$comment"));
        assertEquals("group:common", expressionPropertyNode.get("$comment").asText());
        assertEquals("group:advanced", trimPropertyNode.get("$comment").asText());
    }

    @Test
    void shouldSortPropertiesAccordingToCatalogFromDefinitions() {
        var processorsMap = eipGenerator.generate();

        var definitions = processorsMap.get("setHeader").withObject("propertiesSchema").withObject("definitions");
        assertTrue(definitions.has("org.apache.camel.model.language.ConstantExpression"));
        assertTrue(definitions.withObject("org.apache.camel.model.language.ConstantExpression").has("properties"));
        List<String> sortedPropertiesListConstant = definitions.get("org.apache.camel.model.language.ConstantExpression")
                .withObject("properties").properties().stream().map(Map.Entry::getKey).toList();

        assertEquals(List.of("id", "expression", "resultType", "trim"), sortedPropertiesListConstant);

        assertTrue(definitions.has("org.apache.camel.model.language.DatasonnetExpression"));
        assertTrue(definitions.withObject("org.apache.camel.model.language.DatasonnetExpression").has("properties"));
        List<String> sortedPropertiesListSimple = definitions.get("org.apache.camel.model.language.DatasonnetExpression")
                .withObject("properties").properties().stream().map(Map.Entry::getKey).toList();

        assertEquals(List.of("id", "expression", "bodyMediaType", "outputMediaType", "source", "resultType", "trim"),
                sortedPropertiesListSimple);
    }
}
