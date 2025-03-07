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
package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Process Kubernetes OpenAPI specification JSON.
 */
public class K8sSchemaReader {
    ObjectMapper jsonMapper = new ObjectMapper();
    ObjectNode openApiSpec;

    public K8sSchemaReader(ObjectNode k8sOpenApiSpec) {
        this.openApiSpec = k8sOpenApiSpec;
    }

    /**
     * Get ObjectMeta schema from its OpenAPI spec.
     *
     * @return the ObjectMeta schema
     */
    public ObjectNode getObjectMetaJSONSchema() {
        var ObjectMetaJSON = openApiSpec.withObject("/components/schemas/io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta");
        populateReferences(ObjectMetaJSON, openApiSpec.withObject("/components/schemas"));

        return removeKubernetesCustomKeywords(ObjectMetaJSON);
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
