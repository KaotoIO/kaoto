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

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.Map;

public class CamelYamlDslSchemaProcessor {
    private final ObjectMapper jsonMapper;
    private final ObjectNode yamlDslSchema;

    public CamelYamlDslSchemaProcessor(ObjectMapper mapper, ObjectNode yamlDslSchema) throws Exception {
        this.jsonMapper = mapper;
        this.yamlDslSchema = yamlDslSchema;
    }

    public Map<String, String> processSubSchema() throws Exception {
        var answer = new LinkedHashMap<String, String>();
        var items = yamlDslSchema.withObject("/items");
        var properties = items.withObject("/properties");
        var definitions = items.withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        properties.properties().forEach(p -> {
            var subSchema = doProcessSubSchema(p, relocatedDefinitions, yamlDslSchema);
            answer.put(p.getKey(), subSchema);
        });
        return answer;
    }

    private ObjectNode relocateToRootDefinitions(ObjectNode definitions) {
        var relocatedDefinitions = definitions.deepCopy();
        relocatedDefinitions.findParents("$ref").stream()
                .map(ObjectNode.class::cast)
                .forEach(n -> n.put("$ref", getRelocatedRef(n)));
        return relocatedDefinitions;
    }

    private String getRelocatedRef(ObjectNode parent) {
        return parent.get("$ref").asText().replace("#/items/definitions/", "#/definitions/");
    }

    private String doProcessSubSchema(
            java.util.Map.Entry<String, JsonNode> prop,
            ObjectNode definitions,
            ObjectNode rootSchema
    ) {
        var answer = (ObjectNode) prop.getValue().deepCopy();
        if (answer.has("$ref") && definitions.has(getNameFromRef(answer))) {
            answer = definitions.withObject("/" + getNameFromRef(answer)).deepCopy();

        }
        answer.set("$schema", rootSchema.get("$schema"));
        populateDefinitions(answer, definitions);
        var writer = new StringWriter();
        try {
            JsonGenerator gen = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(gen, answer);
            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String getNameFromRef(ObjectNode parent) {
        var ref = parent.get("$ref").asText();
        return ref.contains("items") ? ref.replace("#/items/definitions/", "")
                : ref.replace("#/definitions/", "");
    }

    private void populateDefinitions(ObjectNode schema, ObjectNode definitions) {
        var schemaDefinitions = schema.withObject("/definitions");
        boolean added = true;
        while(added) {
            added = false;
            for (JsonNode refParent : schema.findParents("$ref")) {
                var name = getNameFromRef((ObjectNode) refParent);
                if (!schemaDefinitions.has(name)) {
                    schemaDefinitions.set(name, definitions.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }
}
