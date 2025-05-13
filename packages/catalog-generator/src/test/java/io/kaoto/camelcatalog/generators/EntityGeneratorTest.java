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

class EntityGeneratorTest {
    EntityGenerator entityGenerator;
    String camelYamlSchema;
    String openapiSpec;
    Map<String, String> localSchemas;

    @BeforeEach
    void setUp() throws IOException {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, true);
        camelCatalogVersionLoader.loadLocalSchemas();

        try (var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json")) {
            if (is == null) {
                throw new IOException("Failed to load schema/camelYamlDsl.json");
            }
            camelYamlSchema = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        try (var is = getClass().getClassLoader().getResourceAsStream("kubernetes-api-v1-openapi.json");) {
            if (is == null) {
                throw new IOException("Failed to load kubernetes-api-v1-openapi.json");
            }
            openapiSpec = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
        localSchemas = camelCatalogVersionLoader.getLocalSchemas();

        entityGenerator = new EntityGenerator(camelCatalog, camelYamlSchema, openapiSpec, localSchemas);
    }

    @Test
    void shouldContainAListOfEntities() {
        var entitiesMap = entityGenerator.generate();

        assertTrue(entitiesMap.containsKey("bean"));
        assertTrue(entitiesMap.containsKey("errorHandler"));
        assertTrue(entitiesMap.containsKey("from"));

        // special schema added to Entity catalog
        assertTrue(entitiesMap.containsKey("KameletConfiguration"));
        assertTrue(entitiesMap.containsKey("PipeConfiguration"));
        assertTrue(entitiesMap.containsKey("PipeErrorHandler"));
    }

    @Test
    void shouldGetProcessorNames() {
        var processorList = entityGenerator.getEntityNames();

        assertTrue(processorList.containsAll(List.of("beans", "errorHandler", "from", "interceptFrom", "route", "rest")));
    }

    @Test
    void shouldGetModelJson() throws IOException {
        var postJson = entityGenerator.getModelJson("beans");

        assertFalse(postJson.isEmpty());
        assertTrue(postJson.has("model"));
        assertTrue(postJson.has("properties"));
        assertFalse(postJson.has("propertiesSchema"));
    }

    @Test
    void shouldGetJsonSchemaForBean() {
        var entitiesMap = entityGenerator.generate();

        var beanNode = entitiesMap.get("bean");
        assertTrue(beanNode.has("propertiesSchema"));

        var beanPropertySchemaNode = beanNode.get("propertiesSchema");
        assertTrue(beanPropertySchemaNode.has("definitions"));
        assertFalse(beanPropertySchemaNode.has("properties"));
    }

    @Test
    void shouldGetJsonSchemaForErrorHandler() {
        var entitiesMap = entityGenerator.generate();

        var errorHandlerNode = entitiesMap.get("errorHandler");
        assertTrue(errorHandlerNode.has("propertiesSchema"));

        var errorHandlerPropertySchemaNode = errorHandlerNode.get("propertiesSchema");
        assertTrue(errorHandlerPropertySchemaNode.has("definitions"));
        assertTrue(errorHandlerPropertySchemaNode.has("properties"));
    }

    @Test
    void shouldGetJsonSchemaForRest() {
        var entitiesMap = entityGenerator.generate();

        var getNode = entitiesMap.get("rest");
        assertTrue(getNode.has("propertiesSchema"));

        var getPropertySchemaNode = getNode.get("propertiesSchema");
        assertTrue(getPropertySchemaNode.has("definitions"));
        assertTrue(getPropertySchemaNode.has("title"));
        assertTrue(getPropertySchemaNode.has("description"));
        assertTrue(getPropertySchemaNode.has("properties"));
    }

    @Test
    void shouldFillSchemaInformation() {
        var entitiesMap = entityGenerator.generate();

        var setHeaderPropertySchemaNode = entitiesMap.get("intercept").withObject("propertiesSchema");
        assertTrue(setHeaderPropertySchemaNode.has("$schema"));
        assertTrue(setHeaderPropertySchemaNode.has("type"));
        assertEquals("http://json-schema.org/draft-07/schema#", setHeaderPropertySchemaNode.get("$schema").asText());
        assertEquals("object", setHeaderPropertySchemaNode.get("type").asText());
    }

    @Test
    void shouldFillRequiredPropertiesIfNeeded() {
        var entitiesMap = entityGenerator.generate();

        var setHeaderNode = entitiesMap.get("from");
        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withObject("propertiesSchema").withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("steps"));
        assertTrue(requiredProperties.contains("uri"));

        var deleteNode = entitiesMap.get("errorHandler");

        assertFalse(deleteNode.withObject("propertiesSchema").has("required"));
    }

    @Test
    void shouldSortPropertiesAccordingToCatalog() {
        var entitiesMap = entityGenerator.generate();

        var setHeaderNode = entitiesMap.get("onCompletion");
        List<String> expectedKeys = List.of("id", "description", "disabled", "mode", "onCompleteOnly",
                "onFailureOnly", "parallelProcessing", "executorService", "useOriginalMessage", "onWhen", "outputs");
        List<String> actualKeys = setHeaderNode.withObject("/properties").properties().stream()
                .map(Map.Entry::getKey).toList();

        assertEquals(expectedKeys, actualKeys);
    }

    @Test
    void shouldFillRequiredPropertiesFromDefinitionsIfNeeded() {
        var entitiesMap = entityGenerator.generate();

        var definitions = entitiesMap.get("bean").withObject("propertiesSchema").withObject("definitions");
        assertTrue(definitions.has("org.apache.camel.model.BeanFactoryDefinition"));
        assertTrue(definitions.withObject("org.apache.camel.model.BeanFactoryDefinition").has("required"));
        List<String> beanRequired = new ArrayList<>();
        definitions.get("org.apache.camel.model.BeanFactoryDefinition").withArray("required").elements()
                .forEachRemaining(item -> beanRequired.add(item.asText()));
        assertTrue(beanRequired.contains("name"));
        assertTrue(beanRequired.contains("type"));
    }

    @Test
    void shouldFillGroupInformation() {
        var entitiesMap = entityGenerator.generate();

        var fromNode = entitiesMap.get("from");
        var uriPropertyNode = fromNode.withObject("propertiesSchema").withObject("properties").withObject("uri");

        assertTrue(uriPropertyNode.has("$comment"));
        assertEquals("group:common", uriPropertyNode.get("$comment").asText());
    }

    @Test
    void shouldFillFormatInformation() {
        var entitiesMap = entityGenerator.generate();

        var onCompletionNode = entitiesMap.get("onCompletion");
        var executorServicePropertyNode = onCompletionNode.withObject("propertiesSchema")
                .withObject("properties").withObject("executorService");

        assertTrue(executorServicePropertyNode.has("format"));
        assertEquals("bean:java.util.concurrent.ExecutorService", executorServicePropertyNode.get("format").asText());
    }


    @Test
    void shouldFillGroupInformationFromDefinitions() {
        var entitiesMap = entityGenerator.generate();

        var onCompletionNode = entitiesMap.get("onCompletion");
        var expressionPropertiesNode = onCompletionNode.withObject("propertiesSchema").withObject("definitions")
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
        var entitiesMap = entityGenerator.generate();

        var definitions = entitiesMap.get("onCompletion").withObject("propertiesSchema").withObject("definitions");
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

    @Test
    void shouldSetExpressionFormatToOneOfExpressionForOnCompletion() {
        var entitiesMap = entityGenerator.generate();

        var oneOfArray = entitiesMap.get("onCompletion").withObject("propertiesSchema").withObject("definitions")
                .withObject("org.apache.camel.model.OnWhenDefinition").withArray("anyOf").get(0);

        assertTrue(oneOfArray.has("format"));
    }

    @Test
    void shouldSetExpressionFormatToOneOfExpressionForOnException() {
        var entitiesMap = entityGenerator.generate();

        var oneOfArray = entitiesMap.get("onException").withObject("propertiesSchema").withObject("definitions")
                .withObject("org.apache.camel.model.OnWhenDefinition").withArray("anyOf").get(0);

        assertTrue(oneOfArray.has("format"));
    }

    @Test
    void shouldSetRedHatProviderIfAvailable() throws JsonProcessingException {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5.redhat-00008");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        entityGenerator = new EntityGenerator(camelCatalog, camelYamlSchema, openapiSpec, localSchemas);
        var processorsMap = entityGenerator.generate();

        var errorHandlerNode = processorsMap.get("errorHandler");
        var modelProvider = errorHandlerNode.withObject("model").get("provider").asText();

        assertEquals("Red Hat", modelProvider);
    }

    @Test
    void shouldNotSetRedHatProviderIfUnavailable() throws JsonProcessingException {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, false);
        boolean loaded = camelCatalogVersionLoader.loadCamelCatalog("4.8.5");
        assertTrue(loaded, "The catalog version wasn't loaded");

        CamelCatalog camelCatalog = camelCatalogVersionLoader.getCamelCatalog();
        entityGenerator = new EntityGenerator(camelCatalog, camelYamlSchema, openapiSpec, localSchemas);
        var processorsMap = entityGenerator.generate();

        var errorHandlerNode = processorsMap.get("errorHandler");
        var modelProvider = errorHandlerNode.withObject("model").get("provider");

        assertNull(modelProvider);
    }

    @Test
    void shouldLogWarningAndReturnNullOnException() {
        TestLoggerHandler mockLoggerHandler = new TestLoggerHandler();
        Logger logger = Logger.getLogger(EntityGenerator.class.getName());
        logger.setUseParentHandlers(false);
        logger.addHandler(mockLoggerHandler);

        ObjectNode result = entityGenerator.getModelJson("invalidEntity");

        assertNull(result, "Expected null result for invalid component");
        assertTrue(mockLoggerHandler.getRecords().stream()
                        .anyMatch(msg -> msg.getMessage().contains("invalidEntity: model definition not found in the catalog")),
                "Expected warning message not logged");
    }
}
