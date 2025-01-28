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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

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
    void shouldFillRequiredPropertiesIfNeededForModelName() {
        var setHeaderNode = (ObjectNode) camelYamlDslSchema
                .get("items")
                .get("definitions")
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .get("setHeader").deepCopy();

        // remove required property to simulate the case where it is not present
        setHeaderNode.remove("required");

        camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded("setHeader", setHeaderNode);

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
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .get("setHeader").deepCopy();

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
    void shouldGetCamelModelByJavaType() {
        EipModel setHeaderModel =
                camelCatalogSchemaEnhancer.getCamelModelByJavaType("org.apache.camel.model.SetHeaderDefinition");

        assertNotNull(setHeaderModel);
        assertEquals("setHeader", setHeaderModel.getName());
        assertFalse(setHeaderModel.getOptions().isEmpty());
    }
}
