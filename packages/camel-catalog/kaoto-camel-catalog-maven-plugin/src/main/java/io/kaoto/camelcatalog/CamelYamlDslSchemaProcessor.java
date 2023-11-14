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
import org.apache.maven.plugin.logging.Log;

import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Process camelYamlDsl.json file, aka Camel YAML DSL JSON schema.
 */
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
        boolean added = true;
        while(added) {
            added = false;
            for (JsonNode refParent : schema.findParents("$ref")) {
                var name = getNameFromRef((ObjectNode) refParent);
                if (!schema.has("definitions") || !schema.withObject("/definitions").has(name)) {
                    var schemaDefinitions = schema.withObject("/definitions");
                    schemaDefinitions.set(name, definitions.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }

    public ObjectNode getProcessors() {
        return yamlDslSchema
                .withObject("/items")
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.ProcessorDefinition")
                .withObject("/properties");
    }

    public String getProcessorDefinitionFQCN(String name) {
        var processorSchema = getProcessors().withObject("/" + name);
        return getNameFromRef(processorSchema);
    }

    public Map<String, ObjectNode> getDataFormats() throws Exception {
        var definitions = yamlDslSchema
                .withObject("/items")
                .withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        var fromMarshal = relocatedDefinitions
                .withObject("/org.apache.camel.model.MarshalDefinition")
                .withArray("/anyOf")
                .get(0).withArray("/oneOf");
        var fromUnmarshal = relocatedDefinitions
                .withObject("/org.apache.camel.model.UnmarshalDefinition")
                .withArray("/anyOf")
                .get(0).withArray("/oneOf");
        if (fromMarshal.size() != fromUnmarshal.size()) {
            // Could this happen in the future? If so, we need to prepare separate sets for marshal and unmarshal
            throw new Exception("Marshal and Unmarshal dataformats are not the same size");
        };

        var answer = new LinkedHashMap<String, ObjectNode>();
        for( var entry : fromMarshal) {
            if (!entry.has("required")) {
                // assuming "not" entry
                continue;
            }
            var entryName = entry.withArray("/required").get(0).asText();
            var property = entry
                    .withObject("/properties")
                    .withObject("/" + entryName);
            var entryDefinitionName = getNameFromRef(property);
            var dataformat = relocatedDefinitions.withObject("/" + entryDefinitionName);
            if (!dataformat.has("oneOf")) {
                answer.put(entryName, dataformat);
                continue;
            }

            var dfOneOf = dataformat.withArray("/oneOf");
            if (dfOneOf.size() != 2) {
                throw new Exception(String.format(
                        "DataFormat '%s' has '%s' entries in oneOf unexpectedly, look it closer",
                        entryDefinitionName,
                        dfOneOf.size()));
            }
            for (var def : dfOneOf) {
                if (def.get("type").asText().equals("object")) {
                    var objectDef = (ObjectNode) def;
                    objectDef.set("title", dataformat.get("title"));
                    objectDef.set("description", dataformat.get("description"));
                    populateDefinitions(objectDef, definitions);
                    answer.put(entryName, objectDef);
                    break;
                }
            }
        }
        return answer;
    }

    public Map<String, ObjectNode> getLanguages() throws Exception {
        var definitions = yamlDslSchema
                .withObject("/items")
                .withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        var languages = relocatedDefinitions
                .withObject("/org.apache.camel.model.language.ExpressionDefinition")
                .withArray("/anyOf").get(0)
                .withArray("/oneOf");

        var answer = new LinkedHashMap<String, ObjectNode>();
        for( var entry : languages) {
            if (!"object".equals(entry.get("type").asText()) || !entry.has("required")) {
                throw new Exception("Unexpected language entry " + entry.asText());
            }
            var entryName = entry.withArray("/required").get(0).asText();
            var property = entry
                    .withObject("/properties")
                    .withObject("/" + entryName);
            var entryDefinitionName = getNameFromRef(property);
            var language = relocatedDefinitions.withObject("/" + entryDefinitionName);
            if (!language.has("oneOf")) {
                answer.put(entryName, language);
                continue;
            }

            var langOneOf = language.withArray("/oneOf");
            if (langOneOf.size() != 2) {
                throw new Exception(String.format(
                        "Language '%s' has '%s' entries in oneOf unexpectedly, look it closer",
                        entryDefinitionName,
                        langOneOf.size()));
            }
            for (var def : langOneOf) {
                if (def.get("type").asText().equals("object")) {
                    var objectDef = (ObjectNode) def;
                    objectDef.set("title", language.get("title"));
                    objectDef.set("description", language.get("description"));
                    populateDefinitions(objectDef, definitions);
                    answer.put(entryName, (ObjectNode) def);
                    break;
                }
            }
        }
        return answer;
    }
}
