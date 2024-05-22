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

import java.io.IOException;
import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Process Kubernetes OpenAPI specification JSON.
 */
public class K8sSchemaProcessor {
    private static final Logger LOGGER = Logger.getLogger(K8sSchemaProcessor.class.getName());
    private final ObjectMapper jsonMapper;
    private final ObjectNode openApiSpec;

    public K8sSchemaProcessor(ObjectMapper mapper, ObjectNode k8sOpenApiSpec) {
        this.jsonMapper = mapper;
        this.openApiSpec = k8sOpenApiSpec;
    }

    /**
     * Get k8s definitions schema from its OpenAPI spec.
     *
     * @param definitions
     * @return
     * @throws Exception
     */
    public Map<String, String> processK8sDefinitions(List<String> definitions) throws Exception {
        var answer = new LinkedHashMap<String, String>();
        var k8sSchemas = openApiSpec.withObject("/components/schemas");
        if (definitions == null) {
            return answer;
        }
        for (String name : definitions) {
            var definition = jsonMapper.createObjectNode();
            definition.put("$schema", "http://json-schema.org/draft-07/schema#");
            definition.put("additionalProperties", false);
            definition.setAll(k8sSchemas.withObject("/" + name));
            populateReferences(definition, k8sSchemas);
            definition = removeKubernetesCustomKeywords(definition);
            var nameSplit = name.split("\\.");
            var displayName = nameSplit[nameSplit.length - 1];
            // ATM we use only few of k8s schemas, so use the short name until we see a
            // conflict
            var writer = new StringWriter();

            try (JsonGenerator jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter()) {
                jsonMapper.writeTree(jsonGenerator, definition);
                answer.put(displayName, writer.toString());
            } catch (IOException e) {
                LOGGER.log(Level.SEVERE, e.toString(), e);
            }

        }
        return answer;
    }

    private void populateReferences(ObjectNode definition, ObjectNode k8sSchemas) {
        var added = true;
        while (added) {
            added = false;
            for (JsonNode refParent : definition.findParents("$ref")) {
                var ref = refParent.get("$ref").asText();
                if (ref.startsWith("#/components")) {
                    ((ObjectNode) refParent).put("$ref", ref.replace("#/components/schemas", "#/definitions"));
                    ref = refParent.get("$ref").asText();
                }
                var name = ref.replace("#/definitions/", "");
                if (!definition.has("definitions") || !definition.withObject("/definitions").has(name)) {
                    var additionalDefinitions = definition.withObject("/definitions");
                    additionalDefinitions.set(name, k8sSchemas.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }

    private ObjectNode removeKubernetesCustomKeywords(ObjectNode definition) {
        var modified = jsonMapper.createObjectNode();
        definition.fields().forEachRemaining(node -> {
            if (!node.getKey().startsWith("x-kubernetes")) {
                var value = node.getValue();
                if (value.isObject()) {
                    value = removeKubernetesCustomKeywords((ObjectNode) value);
                } else if (value.isArray()) {
                    value = removeKubernetesCustomKeywordsFromArrayNode((ArrayNode) value);
                }
                modified.set(node.getKey(), value);
            }
        });
        return modified;
    }

    private ArrayNode removeKubernetesCustomKeywordsFromArrayNode(ArrayNode definition) {
        var modified = jsonMapper.createArrayNode();
        definition.forEach(node -> {
            if (node.isObject()) {
                node = removeKubernetesCustomKeywords((ObjectNode) node);
            } else if (node.isArray()) {
                node = removeKubernetesCustomKeywordsFromArrayNode((ArrayNode) node);
            }
            modified.add(node);
        });
        return modified;
    }
}
