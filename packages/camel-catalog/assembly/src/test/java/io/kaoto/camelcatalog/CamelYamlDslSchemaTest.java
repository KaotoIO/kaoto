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
package io.kaoto.camelcatalog;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class CamelYamlDslSchemaTest extends CamelCatalogTestSupport {

    @Test
    public void testRootSchema() throws Exception {
        var rootSchema = getSchema("camelYamlDsl");
        assertEquals(rootSchema.get("type").asText(), "array");
        var definitions = rootSchema.withObject("/items").withObject("/definitions");
        assertTrue(definitions.has("org.apache.camel.model.ProcessorDefinition"));
    }

    @Test
    public void testBeans() throws Exception {
        var beansSchema = getSchema("beans");
        assertEquals(beansSchema.get("type").asText(), "array");
        var definitions = beansSchema.withObject("/definitions");
        assertEquals(1, definitions.size());
        assertTrue(definitions.has("org.apache.camel.model.BeanFactoryDefinition"));
    }
}
