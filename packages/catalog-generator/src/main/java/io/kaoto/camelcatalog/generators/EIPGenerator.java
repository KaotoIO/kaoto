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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.Kind;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.logging.Level;
import java.util.logging.Logger;

public class EIPGenerator implements Generator {
    private static final Logger LOGGER = Logger.getLogger(EIPGenerator.class.getName());
    CamelCatalog camelCatalog;
    CamelCatalogSchemaEnhancer camelCatalogSchemaEnhancer;
    String camelYamlSchema;
    Map<String, String> kaotoPatterns;
    ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    ObjectNode camelYamlSchemaNode;
    CamelYAMLSchemaReader camelYAMLSchemaReader;

    public EIPGenerator(CamelCatalog camelCatalog, String camelYamlSchema, Map<String, String> kaotoPatterns)
            throws JsonProcessingException {
        this.camelCatalog = camelCatalog;
        this.camelCatalogSchemaEnhancer = new CamelCatalogSchemaEnhancer(camelCatalog);
        this.camelYamlSchema = camelYamlSchema;
        this.kaotoPatterns = kaotoPatterns;
        this.camelYamlSchemaNode = (ObjectNode) jsonMapper.readTree(camelYamlSchema);
        this.camelYAMLSchemaReader = new CamelYAMLSchemaReader(camelYamlSchemaNode);
    }

    /**
     * Generate the EIPs map
     *
     * @return the map of EIPs with the EIP name as the key and the JSON model
     * containing the camel JSON model and the JSON schema from the Camel YAML schema
     */
    public Map<String, ObjectNode> generate() {
        Map<String, ObjectNode> processorMap = new LinkedHashMap<>();

        getEIPNames().forEach(eipName -> {
            var processorJSON = getModelJson(eipName);
            setProvider(processorJSON);
            if (processorJSON != null) {
                String javaType = camelCatalogSchemaEnhancer.getJavaTypeByModelName(eipName);
                var processorJSONSchema = camelYAMLSchemaReader.getEIPJSONSchema(eipName, javaType);
                processorJSON.set("propertiesSchema", processorJSONSchema);

                enhanceJSONSchema(eipName, processorJSONSchema);
                processorMap.put(eipName, processorJSON);
            }
        });

        getRestProcessorNames().forEach(processorName -> {
            var processorJSON = getModelJson(processorName);
            setProvider(processorJSON);
            if (processorJSON != null) {
                var processorJSONSchema = camelYAMLSchemaReader.getRestProcessorJSONSchema(processorName);
                processorJSON.set("propertiesSchema", processorJSONSchema);

                enhanceJSONSchema(processorName, processorJSONSchema);
                processorMap.put(processorName, processorJSON);
            }
        });

        // Add Kaoto custom patterns schemas
        for (var kaotoPatternEntry : kaotoPatterns.entrySet()) {
            var name = kaotoPatternEntry.getKey();

            try {
                ObjectNode processorJSON = (ObjectNode) jsonMapper.readTree(kaotoPatternEntry.getValue());
                setProvider(processorJSON);
                processorMap.put(name, processorJSON);
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, String.format("Cannot load %s definition", name), e);
            }
        }

        return processorMap;
    }

    /**
     * Enhance the Processor JSON Schema
     */
    private void enhanceJSONSchema(String processorName, ObjectNode processorJSONSchema) {
        camelCatalogSchemaEnhancer.fillSchemaInformation(processorJSONSchema);
        camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(Kind.model, processorName, processorJSONSchema);
        camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(processorName, processorJSONSchema);
        camelCatalogSchemaEnhancer.fillPropertiesInformation(processorName, processorJSONSchema);
        camelCatalogSchemaEnhancer.fillExpressionFormatInOneOf(processorJSONSchema);

        if (processorJSONSchema.has("definitions")) {
            iterateOverDefinitions(processorJSONSchema.withObject("definitions"), (model, node) -> {
                if (model == null) {
                    return;
                }

                camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(model, node);
                camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(model, node);
                camelCatalogSchemaEnhancer.fillPropertiesInformation(model, node);
                camelCatalogSchemaEnhancer.fillExpressionFormatInOneOf(node);
            });
        }
    }

    /**
     * Get the list of EIP names from the Camel YAML schema
     * <p>
     * camelCatalog.findModelNames() returns a list of all camel models, therefore
     * we need to rely on the Camel YAML schema to get the list of EIPs that
     * could be written in a YAML file.
     *
     * @return the list of EIP names
     */
    List<String> getEIPNames() {
        HashSet<String> eipNames = new HashSet<>();
        var eipsIterator = this.camelYamlSchemaNode.get("items").get("definitions")
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .fields();

        while (eipsIterator.hasNext()) {
            var entry = eipsIterator.next();
            if (!"whenSkipSendToEndpoint".equals(entry.getKey())) {
                eipNames.add(entry.getKey());
            }
        }

        eipNames.add("when");
        eipNames.add("otherwise");
        eipNames.add("onFallback");

        return eipNames.stream().toList();
    }

    /**
     * Get the list of REST Processors names
     *
     * @return the list of Processors names
     */
    List<String> getRestProcessorNames() {

        return List.of("get", "post", "put", "delete", "head", "patch");
    }

    /**
     * Get the JSON model of a Processor
     *
     * @param modelName the name of the Processor, e.g. "to", "setHeader"
     * @return the JSON model of the Processor including its properties
     */
    ObjectNode getModelJson(String modelName) {
        String eipJson = camelCatalog.modelJSonSchema(modelName);

        try {
            return (ObjectNode) jsonMapper.readTree(eipJson);
        } catch (IllegalArgumentException | JsonProcessingException e) {
            LOGGER.log(Level.WARNING, modelName + ": model definition not found in the catalog");
        }

        return null;
    }

    /**
     * Iterate over the definitions of an EIP
     *
     * @param definitionsNode the definitions node of the EIP,
     *                        e.g. {"org.apache.camel.model.language.ConstantExpression": {...}, "org.apache.camel.model.language.SimpleExpression": {...}}
     * @param consumer        the consumer to apply to each definition. It takes the EIP model and the definition node and the model could be null.
     */
    void iterateOverDefinitions(ObjectNode definitionsNode, BiConsumer<EipModel, ObjectNode> consumer) {
        definitionsNode.fields().forEachRemaining(entry -> {
            String javaType = entry.getKey();
            ObjectNode node = (ObjectNode) entry.getValue();

            EipModel model = camelCatalogSchemaEnhancer.getCamelModelByJavaType(javaType);
            consumer.accept(model, node);
        });
    }

    private void setProvider(ObjectNode modelDefinition) {
        String modelVersion = camelCatalog.getLoadedVersion();

        if (modelVersion.contains("redhat")) {
            modelDefinition.withObject("model").put("provider", "Red Hat");
        }
    }
}
