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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.logging.Level;
import java.util.logging.Logger;

public class EntityGenerator implements Generator {
    private static final Logger LOGGER = Logger.getLogger(EntityGenerator.class.getName());
    CamelCatalog camelCatalog;
    CamelCatalogSchemaEnhancer camelCatalogSchemaEnhancer;
    String camelYamlSchema;
    ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    ObjectNode camelYamlSchemaNode;
    CamelYAMLSchemaReader camelYAMLSchemaReader;
    ObjectNode openapiSpecNode;
    K8sSchemaReader k8sSchemaReader;
    private final Map<String, String> localSchemas;

    public EntityGenerator(CamelCatalog camelCatalog,
                           String camelYamlSchema,
                           String openapiSpec,
                           Map<String, String> localSchemas) throws JsonProcessingException {
        this.camelCatalog = camelCatalog;
        this.camelCatalogSchemaEnhancer = new CamelCatalogSchemaEnhancer(camelCatalog);
        this.camelYamlSchema = camelYamlSchema;
        this.camelYamlSchemaNode = (ObjectNode) jsonMapper.readTree(camelYamlSchema);
        this.camelYAMLSchemaReader = new CamelYAMLSchemaReader(camelYamlSchemaNode);
        this.openapiSpecNode = (ObjectNode) jsonMapper.readTree(openapiSpec);
        this.k8sSchemaReader = new K8sSchemaReader(openapiSpecNode);
        this.localSchemas = localSchemas;
    }

    /**
     * Generate the EIPs map
     *
     * @return the map of EIPs with the EIP name as the key and the JSON model
     * containing the camel JSON model and the JSON schema from the Camel YAML schema
     */
    public Map<String, ObjectNode> generate() {
        Map<String, ObjectNode> entityMap = new LinkedHashMap<>();

        getEntityNames().forEach(entityName -> {
            ObjectNode entityJSON = getModelJson(entityName);
            if (entityJSON != null) {
                var processorJSONSchema = camelYAMLSchemaReader.getEntityJSONSchema(entityName);
                entityJSON.set("propertiesSchema", processorJSONSchema);
                enhanceJSONSchema(entityName, processorJSONSchema);

                entityMap.put("beans".equals(entityName) ? "bean" : entityName, entityJSON);
            }
        });

        // Add ObjectMeta Schema
        var objectMetaJSON = k8sSchemaReader.getObjectMetaJSONSchema();
        camelCatalogSchemaEnhancer.fillSchemaInformation(objectMetaJSON);
        ObjectNode objectMetaSchema = jsonMapper.createObjectNode();
        objectMetaSchema.set("propertiesSchema", objectMetaJSON);
        entityMap.put("ObjectMeta", objectMetaSchema);

        // Add custom schemas
        for (var localSchemaEntry : localSchemas.entrySet()) {
            try {
                var name = localSchemaEntry.getKey();
                ObjectNode schema = jsonMapper.createObjectNode();
                schema.set("propertiesSchema", jsonMapper.readTree(localSchemaEntry.getValue()));
                entityMap.put(name, schema);
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Local Schema definition not found");
            }
        }

        return entityMap;
    }

    /**
     * Enhance the Processor JSON Schema
     */
    private void enhanceJSONSchema(String processorName, ObjectNode processorJSONSchema) {
        camelCatalogSchemaEnhancer.fillSchemaInformation(processorJSONSchema);
        camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(Kind.model, processorName, processorJSONSchema);
        camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(processorName, processorJSONSchema);
        camelCatalogSchemaEnhancer.fillPropertiesInformation(processorName, processorJSONSchema);

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
    List<String> getEntityNames() {
        List<String> entityNames = new ArrayList<>();
        var entitesIterator = this.camelYamlSchemaNode.get("items").get("properties").fields();

        while (entitesIterator.hasNext()) {
            var entry = entitesIterator.next();
            entityNames.add(entry.getKey());
        }

        return entityNames;
    }

    /**
     * Get the JSON model of a Entity
     *
     * @param modelName the name of the Entity, e.g. "route", "rest"
     * @return the JSON model of the Entity including its properties
     */
    ObjectNode getModelJson(String modelName) {
        String entityJson = null;
        if ("beans".equals(modelName)) {
            try (InputStream is = camelCatalog.getClass().getClassLoader()
                    .getResourceAsStream("org/apache/camel/catalog/models-app/bean.json")) {
                entityJson = new String(is.readAllBytes());
            } catch (IOException e) {
                LOGGER.log(Level.WARNING, "Error reading Beans definition from the catalog");
            }
        } else {
            entityJson = camelCatalog.modelJSonSchema(modelName);
        }

        try {
            /* The rootEntityDefinition object contains the EIP definition and its properties */
            ObjectNode rootEntityDefinition = (ObjectNode) jsonMapper.readTree(entityJson);
            ObjectNode modelDefinition = rootEntityDefinition.withObject("model");
            String modelVersion = camelCatalog.getLoadedVersion();

            if (modelVersion.contains("redhat")) {
                modelDefinition.put("provider", "Red Hat");
            }

            return rootEntityDefinition;
        } catch (IllegalArgumentException | JsonProcessingException e) {
            LOGGER.log(Level.WARNING, modelName + ": model definition not found in the catalog");
        }

        return  null;
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
}
