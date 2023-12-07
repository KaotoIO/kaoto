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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.Kind;
import org.apache.camel.tooling.model.ComponentModel;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.JsonMapper;

import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;

/**
 * Customize Camel Catalog for Kaoto.
 */
public class CamelCatalogProcessor {
    private final ObjectMapper jsonMapper;
    private final DefaultCamelCatalog api;
    private final CamelYamlDslSchemaProcessor schemaProcessor;

    public CamelCatalogProcessor(ObjectMapper jsonMapper, CamelYamlDslSchemaProcessor schemaProcessor) {
        this.jsonMapper = jsonMapper;
        this.api = new DefaultCamelCatalog();
        this.schemaProcessor = schemaProcessor;
    }

    /**
     * Create Camel catalogs customized for Kaoto usage.
     * @return
     */
    public Map<String, String> processCatalog() throws Exception {
        var answer = new LinkedHashMap<String, String>();
        var componentCatalog = getComponentCatalog();
        var dataFormatCatalog = getDataFormatCatalog();
        var languageCatalog = getLanguageCatalog();
        var modelCatalog = getModelCatalog();
        var patternCatalog = getPatternCatalog();
        answer.put("components", componentCatalog);
        answer.put("dataformats", dataFormatCatalog);
        answer.put("languages", languageCatalog);
        answer.put("models", modelCatalog);
        answer.put("patterns", patternCatalog);
        return answer;
    }

    /**
     * Get aggregated Camel component Catalog.
     * @return
     * @throws Exception
     */
    public String getComponentCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        api.findComponentNames().stream().sorted().forEach((name) -> {
            try {
                var model = (ComponentModel) api.model(Kind.component, name);
                var json = JsonMapper.asJsonObject(model).toJson();
                var catalogNode = (ObjectNode) jsonMapper.readTree(json);
                generatePropertiesSchema(catalogNode);
                answer.set(name, catalogNode);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    private void generatePropertiesSchema(ObjectNode parent) throws Exception {
        var answer = parent.withObject("/propertiesSchema");
        answer.put("$schema", "http://json-schema.org/draft-07/schema#");
        answer.put("type", "object");

        var properties = parent.withObject("/properties");
        var answerProperties = answer.withObject("/properties");
        var required = new LinkedHashSet<String>();
        for (var propertyEntry : properties.properties()) {
            var propertyName = propertyEntry.getKey();
            var property = propertyEntry.getValue();
            var propertySchema = answerProperties.withObject("/" + propertyName);
            if (property.has("displayName")) propertySchema.put("title", property.get("displayName").asText());
            if (property.has("description")) propertySchema.put("description", property.get("description").asText());
            var propertyType = "string";
            if (property.has("type")) {
                propertyType = property.get("type").asText();
                if ("duration".equals(propertyType)) {
                    propertyType = "string";
                    propertySchema.put("$comment", "duration");
                }
                propertySchema.put("type", propertyType);
            }
            if (property.has("deprecated")) propertySchema.put("deprecated", property.get("deprecated").asBoolean());
            if (property.has("required") && property.get("required").asBoolean()) {
                required.add(propertyName);
            }
            if (property.has("defaultValue")) {
                if ("array".equals(propertyType)) {
                    propertySchema.withArray("/default").add(property.get("defaultValue"));
                } else {
                    propertySchema.set("default", property.get("defaultValue"));
                }
            }

            if (property.has("enum")) {
                property.withArray("/enum")
                        .forEach(e -> propertySchema.withArray("/enum").add(e));
            } else if ("array".equals(propertyType)) {
                propertySchema.withObject("/items").put("type", "string");
            } else if ("object".equals(propertyType) && property.has("javaType") && !property.get("javaType").asText().startsWith("java.util.Map")) {
                // Put "string" as a type and javaType as a schema $comment to indicate
                // that the UI should handle this as a bean reference field
                propertySchema.put("type", "string");
                propertySchema.put("$comment", "class:" + property.get("javaType").asText());
            }
        }
        required.forEach(req -> answer.withArray("/required").add(req));
    }

    /**
     * Get aggregated Camel DataFormat catalog with a custom dataformat added.
     * @return
     * @throws Exception
     */
    public String getDataFormatCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var dataFormatSchemaMap = schemaProcessor.getDataFormats();
        for (var entry : dataFormatSchemaMap.entrySet()) {
            var dataFormatName = entry.getKey();
            var dataFormatSchema = entry.getValue();
            var dataFormatCatalog = (EipModel) api.model(Kind.eip, dataFormatName);
            if (dataFormatCatalog == null) {
                throw new Exception("DataFormat " + dataFormatName + " is not found in Camel model catalog.");
            }
            var json = JsonMapper.asJsonObject(dataFormatCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", dataFormatSchema);
            answer.set(dataFormatName, catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    /**
     * Get Camel language catalog with a custom language added.
     * @return
     * @throws Exception
     */
    public String getLanguageCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var languageSchemaMap = schemaProcessor.getLanguages();
        for (var entry : languageSchemaMap.entrySet()) {
            var languageName = entry.getKey();
            var languageSchema = entry.getValue();
            var languageCatalog = (EipModel) api.model(Kind.eip, languageName);
            if (languageCatalog == null) {
                throw new Exception("Language " + languageName + " is not found in Camel model catalog.");
            }
            var json = JsonMapper.asJsonObject(languageCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", languageSchema);
            answer.set(languageName, catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    public String getModelCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        api.findModelNames().stream().sorted().forEach((name) -> {
            try {
                var model = (EipModel) api.model(Kind.eip, name);
                var json = JsonMapper.asJsonObject(model).toJson();
                var catalogNode = (ObjectNode) jsonMapper.readTree(json);
                if ("from".equals(name)) {
                    // "from" is an exception that is not a processor, therefore it's not in the
                    // pattern catalog - put the propertiesSchema here
                    generatePropertiesSchema(catalogNode);
                }
                answer.set(name, catalogNode);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    /**
     * Get a Camel processor model catalog filtered from model catalog by comparing with YAML DSL schema.
     * @return
     * @throws Exception
     */
    public String getPatternCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var processors = schemaProcessor.getProcessors();
        var catalogMap = new LinkedHashMap<String, EipModel>();
        for (var name : api.findModelNames()) {
            var modelCatalog = (EipModel) api.model(Kind.eip, name);
            catalogMap.put(modelCatalog.getJavaType(), modelCatalog);
        }
        for (var entry : processors.entrySet()) {
            var processorFQCN = entry.getKey();
            var processorSchema = entry.getValue();
            var processorCatalog = catalogMap.get(processorFQCN);
            for (var property : processorSchema.withObject("/properties").properties()) {
                var propertyName = property.getKey();
                var propertySchema = (ObjectNode) property.getValue();
                if ("org.apache.camel.model.ToDynamicDefinition".equals(processorFQCN) && "parameters".equals(propertyName)) {
                    // "parameters" as a common property is omitted in the catalog, but we need this for "toD"
                    propertySchema.put("title", "Parameters");
                    propertySchema.put("description", "URI parameters");
                    continue;
                }
                var catalogOpOptional = processorCatalog.getOptions().stream().filter(op -> op.getName().equals(propertyName)).findFirst();
                if (catalogOpOptional.isEmpty()) {
                    throw new Exception(String.format("Option '%s' not found for processor '%s'", propertyName, processorFQCN));
                }
                var catalogOp = catalogOpOptional.get();
                if ("object".equals(catalogOp.getType()) && !catalogOp.getJavaType().startsWith("java.util.Map")
                        && !propertySchema.has("$comment")) {
                    propertySchema.put("$comment", "class:" + catalogOp.getJavaType());
                }
            }
            var json = JsonMapper.asJsonObject(processorCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", processorSchema);
            answer.set(processorCatalog.getName(), catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }
}
