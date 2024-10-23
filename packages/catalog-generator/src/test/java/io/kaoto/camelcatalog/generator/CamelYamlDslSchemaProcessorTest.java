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
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CamelYamlDslSchemaProcessorTest {
    private ObjectMapper jsonMapper;
    private CamelYamlDslSchemaProcessor processor;

    @BeforeEach
    void setUp() throws Exception {
        jsonMapper = new ObjectMapper();
        var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        ObjectNode yamlDslSchema = (ObjectNode) jsonMapper.readTree(is);

        processor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
    }

    @Test
    void testProcessSubSchema() throws Exception {
        var subSchemaMap = processor.processSubSchema();
        assertTrue(subSchemaMap.size() > 10 && subSchemaMap.size() < 20);
        var beansSchema = jsonMapper.readTree(subSchemaMap.get("beans"));
        assertEquals("array", beansSchema.get("type").asText());
        var beanSchema = beansSchema
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.BeanFactoryDefinition");
        var beanPropertySchema = beanSchema
                .withObject("/properties")
                .withObject("/properties");
        assertEquals("object", beanPropertySchema.get("type").asText());
    }

    @Test
    void testExtractSingleOneOfFromAnyOf() throws Exception {
        var subSchemaMap = processor.processSubSchema();
        var errorHandlerSchema = jsonMapper.readTree(subSchemaMap.get("errorHandler"));

        assertFalse(errorHandlerSchema.has("anyOf"));

        assertTrue(errorHandlerSchema.has("oneOf"));
        assertTrue(errorHandlerSchema.get("oneOf").isArray());
        assertEquals(6, errorHandlerSchema.get("oneOf").size());
    }

    @Test
    void testRemoveEmptyProperties() throws Exception {
        var tokenizerRootSchema = (ObjectNode) jsonMapper.readTree(
                getClass().getClassLoader().getResourceAsStream("camel-4.9.0-tokenizer-schema.json"));
        processor = new CamelYamlDslSchemaProcessor(jsonMapper, tokenizerRootSchema);

        var subSchemaMap = processor.processSubSchema();
        var tokenizerSchema = jsonMapper.readTree(subSchemaMap.get("tokenizer"));
        var properties = tokenizerSchema.withObject("/properties");

        assertFalse(properties.has("langChain4jCharacterTokenizer"), "The langChain4jCharacterTokenizer empty property should not exist, since is empty");
        assertFalse(properties.has("langChain4jLineTokenizer"), "The langChain4jLineTokenizer empty property should not exist, since is empty");
        assertFalse(properties.has("langChain4jParagraphTokenizer"), "The langChain4jParagraphTokenizer empty property should not exist, since is empty");
        assertFalse(properties.has("langChain4jSentenceTokenizer"), "The langChain4jSentenceTokenizer empty property should not exist, since is empty");
        assertFalse(properties.has("langChain4jWordTokenizer"), "The langChain4jWordTokenizer empty property should not exist, since is empty");
    }

    @Test
    void testRemoveNotFromOneOf() throws Exception {
        var tokenizerRootSchema = (ObjectNode) jsonMapper.readTree(
                getClass().getClassLoader().getResourceAsStream("camel-4.9.0-tokenizer-schema.json"));
        processor = new CamelYamlDslSchemaProcessor(jsonMapper, tokenizerRootSchema);

        var subSchemaMap = processor.processSubSchema();
        var tokenizerSchema = jsonMapper.readTree(subSchemaMap.get("tokenizer"));
        var oneOfArray = tokenizerSchema.withArray("/oneOf");

        assertEquals(5, oneOfArray.size());
        oneOfArray.forEach(oneOf -> {
            assertTrue(oneOf.has("properties"));
            assertFalse(oneOf.has("not"));
        });
    }

    @Test
    void testGetDataFormats() throws Exception {
        var dataFormatMap = processor.getDataFormats();
        assertTrue(dataFormatMap.size() > 30 && dataFormatMap.size() < 50);
        var customDataFormat = dataFormatMap.get("custom");
        assertEquals("Custom", customDataFormat.get("title").asText());
        var refProperty = customDataFormat.withObject("/properties").withObject("/ref");
        assertEquals("Ref", refProperty.get("title").asText());
        var jsonDataFormat = dataFormatMap.get("json");
        assertEquals("JSon", jsonDataFormat.get("title").asText());
        var libraryEnum = jsonDataFormat.withObject("/properties").withObject("/library").withArray("enum");
        assertTrue(libraryEnum.size() > 4);
    }

    @Test
    void testGetDataFormatYaml() throws Exception {
        var dataFormatMap = processor.getDataFormats();
        var yamlDataFormat = dataFormatMap.get("yaml");
        var typeFilterDefinition = yamlDataFormat.withObject("/definitions")
                .withObject("org.apache.camel.model.dataformat.YAMLTypeFilterDefinition");
        assertEquals("object", typeFilterDefinition.get("type").asText());
        var propType = typeFilterDefinition.withObject("/properties").withObject("/type");
        assertEquals("string", propType.get("type").asText());
        assertEquals("Type", propType.get("title").asText());
    }

    @Test
    void testGetLanguages() throws Exception {
        var languageMap = processor.getLanguages();
        assertTrue(languageMap.size() > 20 && languageMap.size() < 30);
        var customLanguage = languageMap.get("language");
        assertEquals("Language", customLanguage.get("title").asText());
        var languageProperty = customLanguage.withObject("/properties").withObject("/language");
        assertEquals("Language", languageProperty.get("title").asText());
        var jqLanguage = languageMap.get("jq");
        assertEquals("JQ", jqLanguage.get("title").asText());
        var expressionProperty = jqLanguage.withObject("/properties").withObject("/expression");
        assertEquals("Expression", expressionProperty.get("title").asText());
    }

    @Test
    void testGetProcessors() throws Exception {
        var processorMap = processor.getProcessors();
        assertTrue(processorMap.size() > 50 && processorMap.size() < 100);
        var aggregate = processorMap.get("org.apache.camel.model.AggregateDefinition");
        assertFalse(aggregate.withObject("/properties").has("inheritErrorHandler"));
        assertTrue(aggregate.withObject("/properties").has("completionPredicate"));
        var completionPredicate = aggregate.withObject("/properties").withObject("/completionPredicate");
        assertEquals("object", completionPredicate.get("type").asText());
        assertEquals("expression", completionPredicate.get("$comment").asText());

        var setHeader = processorMap.get("org.apache.camel.model.SetHeaderDefinition");
        assertFalse(setHeader.withObject("/properties").has("expression"));
        assertEquals("expression", setHeader.get("$comment").asText());
        assertFalse(setHeader.has("anyOf"));

        var bean = processorMap.get("org.apache.camel.model.BeanDefinition");
        assertFalse(bean.has("oneOf"));
        var beanType = bean.withObject("/properties").withObject("/beanType");
        assertEquals("string", beanType.get("type").asText());

        var marshal = processorMap.get("org.apache.camel.model.MarshalDefinition");
        assertFalse(marshal.has("anyOf"));
        assertEquals("dataformat", marshal.get("$comment").asText());

        var toD = processorMap.get("org.apache.camel.model.ToDynamicDefinition");
        assertTrue(toD.withObject("/properties").has("uri"));
        assertTrue(toD.withObject("/properties").has("parameters"));

        var loadBalance = processorMap.get("org.apache.camel.model.LoadBalanceDefinition");
        assertFalse(loadBalance.has("anyOf"));
        assertEquals("loadbalance,steps", loadBalance.get("$comment").asText());

        var saga = processorMap.get("org.apache.camel.model.SagaDefinition");
        var sagaCompensation = saga.withObject("/properties").withObject("/compensation");
        assertTrue(sagaCompensation.get("$ref").asText().endsWith("SagaActionUriDefinition"));
        var actionDef = saga.withObject("/definitions").withObject("/org.apache.camel.model.SagaActionUriDefinition");
        assertFalse(actionDef.has("oneOf"));
        assertEquals("object", actionDef.withObject("/properties").withObject("/parameters").get("type").asText());
        var propExpDef =
                saga.withObject("/definitions").withObject("/org.apache.camel.model.PropertyExpressionDefinition");
        assertEquals("object", propExpDef.withObject("/properties").withObject("/expression").get("type").asText());
        assertEquals("expression",
                propExpDef.withObject("/properties").withObject("/expression").get("$comment").asText());
    }

    @Test
    void testGetEntities() throws Exception {
        var entityMap = processor.getEntities();
        List.of(
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
                "rest").forEach(name -> assertTrue(entityMap.containsKey(name), name));
    }

    @Test
    void testGetLoadBalancers() throws Exception {
        var lbMap = processor.getLoadBalancers();
        assertTrue(lbMap.containsKey("customLoadBalancer"));
        var customLb = lbMap.get("customLoadBalancer");
        assertEquals("Custom Load Balancer", customLb.get("title").asText());
        var customLbRefProp = customLb.withObject("/properties/ref");
        assertEquals("string", customLbRefProp.get("type").asText());
        assertEquals("Ref", customLbRefProp.get("title").asText());
    }
}
