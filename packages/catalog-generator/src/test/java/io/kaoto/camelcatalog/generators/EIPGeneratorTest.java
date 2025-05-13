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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.TestLoggerHandler;
import io.kaoto.camelcatalog.maven.CamelCatalogVersionLoader;
import io.kaoto.camelcatalog.model.CatalogRuntime;
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
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

class EIPGeneratorTest {
    EIPGenerator eipGenerator;
    String camelYamlSchema;
    CamelCatalogVersionLoader camelCatalogVersionLoader;

    @BeforeEach
    void setUp() throws IOException {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        try (var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json")) {
            assert is != null;
            camelYamlSchema = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        camelCatalogVersionLoader.loadKaotoPatterns();

        eipGenerator = new EIPGenerator(camelCatalog, camelYamlSchema, camelCatalogVersionLoader.getKaotoPatterns());
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
    void shouldNotGetWhenSkipSendToEndpoint() {
        var processorList = eipGenerator.getEIPNames();

        assertFalse(processorList.contains("whenSkipSendToEndpoint"));
    }

    @Test
    void shouldNotifyWhenKaotoPatternsCannotBeLoaded() throws Exception {
        TestLoggerHandler mockLoggerHandler = new TestLoggerHandler();
        Logger logger = Logger.getLogger(EIPGenerator.class.getName());
        logger.setUseParentHandlers(false);
        logger.addHandler(mockLoggerHandler);

        eipGenerator.kaotoPatterns.put("invalidEIP", "5@");
        eipGenerator.generate();

        assertTrue(mockLoggerHandler.getRecords().stream()
                        .anyMatch(msg -> msg.getMessage().contains("Cannot load invalidEIP definition")),
                "Expected warning message not logged");
    }

    @Test
    void shouldNotLoadNullEntries() throws Exception {
        EIPGenerator spiedEipGenerator = spy(eipGenerator);
        when(spiedEipGenerator.getEIPNames()).thenReturn(List.of("invalidEIP"));
        when(spiedEipGenerator.getRestProcessorNames()).thenReturn(List.of("invalidRest"));
        spiedEipGenerator.kaotoPatterns.clear();

        var result = spiedEipGenerator.generate();

        assertTrue(result.isEmpty(), "Expected empty result for invalid component");

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
        List<String> sortedPropertiesListConstant =
                definitions.get("org.apache.camel.model.language.ConstantExpression")
                        .withObject("properties").properties().stream().map(Map.Entry::getKey).toList();

        assertEquals(List.of("id", "expression", "resultType", "trim"), sortedPropertiesListConstant);

        assertTrue(definitions.has("org.apache.camel.model.language.DatasonnetExpression"));
        assertTrue(definitions.withObject("org.apache.camel.model.language.DatasonnetExpression").has("properties"));
        List<String> sortedPropertiesListSimple =
                definitions.get("org.apache.camel.model.language.DatasonnetExpression")
                        .withObject("properties").properties().stream().map(Map.Entry::getKey).toList();

        assertEquals(List.of("id", "expression", "bodyMediaType", "outputMediaType", "source", "resultType", "trim"),
                sortedPropertiesListSimple);
    }

    @Test
    void shouldSetExpressionPropertyFormatToExpressionProperty() {
        var processorsMap = eipGenerator.generate();

        var correlationExpressionPropertyNode =
                processorsMap.get("aggregate").withObject("propertiesSchema").withObject("properties")
                        .withObject("correlationExpression");

        assertTrue(correlationExpressionPropertyNode.has("format"));
    }

    @Test
    void shouldSetExpressionFormatToOneOfExpression() {
        var processorsMap = eipGenerator.generate();

        var oneOfArray = processorsMap.get("setHeader").withObject("propertiesSchema").withArray("anyOf").get(0);

        assertTrue(oneOfArray.has("format"));
    }

    @Test
    void shouldSetExpressionFormatToPropertyExpressionDefinition() {
        var processorsMap = eipGenerator.generate();

        var oneOfNode = processorsMap.get("saga").withObject("propertiesSchema").withObject("definitions")
                .withObject("org.apache.camel.model.PropertyExpressionDefinition").withArray("anyOf").get(0);

        assertTrue(oneOfNode.has("format"));
    }

    @Test
    void shouldSetExpressionFormatToPropertyExpression() {
        var processorsMap = eipGenerator.generate();

        var correlationExpressionNode =
                processorsMap.get("aggregate").withObject("propertiesSchema").withObject("properties")
                        .withObject("correlationExpression");

        assertTrue(correlationExpressionNode.has("format"));
    }

    @Test
    void shouldLoadKaotoPatterns() {
        var processorsMap = eipGenerator.generate();

        assertTrue(processorsMap.containsKey("kaoto-datamapper"));
    }

    @Test
    void shouldSetRedHatProviderIfAvailable() throws JsonProcessingException {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5.redhat-00008");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        camelCatalogVersionLoader.loadKaotoPatterns();

        eipGenerator = new EIPGenerator(camelCatalog, camelYamlSchema, camelCatalogVersionLoader.getKaotoPatterns());
        var processorsMap = eipGenerator.generate();

        var logProcessor = processorsMap.get("log").withObject("model").get("provider").asText();
        var getProcessor = processorsMap.get("get").withObject("model").get("provider").asText();
        var kaotoDataMapperProcessor =
                processorsMap.get("kaoto-datamapper").withObject("model").get("provider").asText();

        assertEquals("Red Hat", logProcessor);
        assertEquals("Red Hat", getProcessor);
        assertEquals("Red Hat", kaotoDataMapperProcessor);
    }

    @Test
    void shouldNotSetRedHatProviderIfUnavailable() throws JsonProcessingException {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        eipGenerator = new EIPGenerator(camelCatalog, camelYamlSchema, camelCatalogVersionLoader.getKaotoPatterns());
        var processorsMap = eipGenerator.generate();

        var logNode = processorsMap.get("log");
        var componentProvider = logNode.withObject("model").get("provider");

        assertNull(componentProvider);
    }

    @Test
    void shouldLogWarningAndReturnNullOnException() {
        TestLoggerHandler mockLoggerHandler = new TestLoggerHandler();
        Logger logger = Logger.getLogger(EIPGenerator.class.getName());
        logger.setUseParentHandlers(false);
        logger.addHandler(mockLoggerHandler);

        ObjectNode result = eipGenerator.getModelJson("invalidEIP");

        assertNull(result, "Expected null result for invalid component");
        assertTrue(mockLoggerHandler.getRecords().stream()
                        .anyMatch(msg -> msg.getMessage().contains("invalidEIP: model definition not found in the catalog")),
                "Expected warning message not logged");
    }
}
