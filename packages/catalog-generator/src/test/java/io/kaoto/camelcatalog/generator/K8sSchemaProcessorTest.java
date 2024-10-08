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

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class K8sSchemaProcessorTest {
    private static final String[] K8S_DEFINITIONS =
            new String[] {
                    "io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta",
                    "io.k8s.api.core.v1.ObjectReference"
            };
    private final ObjectMapper jsonMapper;
    private final K8sSchemaProcessor processor;

    K8sSchemaProcessorTest() throws Exception {
        jsonMapper = new ObjectMapper();
        var openapiSpec = (ObjectNode) jsonMapper.readTree(getClass().getClassLoader().getResourceAsStream("kubernetes-api-v1-openapi.json"));
        processor = new K8sSchemaProcessor(jsonMapper, openapiSpec);
    }

    @Test
    void test() throws Exception {
        var schemaMap = processor.processK8sDefinitions(List.of(K8S_DEFINITIONS));
        var objectMeta = (ObjectNode) jsonMapper.readTree(schemaMap.get("ObjectMeta"));
        assertTrue(objectMeta.withObject("/properties").has("annotations"));
        var objectReference = (ObjectNode) jsonMapper.readTree(schemaMap.get("ObjectReference"));
        assertTrue(objectReference.withObject("/properties").has("fieldPath"));
    }
}
