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

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

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
    void shouldContainAListOfEips() {
        var eipsMap = eipGenerator.generate();

        assertTrue(eipsMap.containsKey("aggregate"));
        assertTrue(eipsMap.containsKey("to"));
        assertTrue(eipsMap.containsKey("setHeader"));
        assertTrue(eipsMap.containsKey("setHeaders"));

        assertTrue(eipsMap.containsKey("choice"));
        assertTrue(eipsMap.containsKey("doTry"));

        /* These are special cases, while they are processors, they cannot be used directly */
        assertTrue(eipsMap.containsKey("when"));
        assertTrue(eipsMap.containsKey("otherwise"));
        assertTrue(eipsMap.containsKey("doCatch"));
        assertTrue(eipsMap.containsKey("doFinally"));
    }

    @Test
    void shouldFillRequiredPropertiesIfNeeded() {
        var eipsMap = eipGenerator.generate();

        var setHeaderNode = eipsMap.get("setHeader");
        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withObject("propertiesSchema").withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("name"));
        assertTrue(requiredProperties.contains("expression"));
    }

    @Test
    void shouldFillRequiredPropertiesFromSchemaIfNeeded() {
        var eipsMap = eipGenerator.generate();

        var setHeaderNode = eipsMap.get("setHeader");

        List<String> requiredProperties = new ArrayList<>();
        setHeaderNode.withObject("propertiesSchema").withArray("required").elements()
                .forEachRemaining(node -> requiredProperties.add(node.asText()));

        assertTrue(requiredProperties.contains("name"));
        assertTrue(requiredProperties.contains("expression"));
    }

    @Test
    void shouldFillRequiredPropertiesFromDefinitionsIfNeeded() {
        var eipsMap = eipGenerator.generate();

        ObjectNode definitions =
                eipsMap.get("setHeader").withObject("propertiesSchema").withObject("definitions");

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
}
