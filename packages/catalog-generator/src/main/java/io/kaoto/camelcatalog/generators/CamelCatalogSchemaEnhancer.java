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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.generator.CamelYamlDSLKeysComparator;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.tooling.model.EipModel;

import java.util.*;

public class CamelCatalogSchemaEnhancer {

    private final CamelCatalog camelCatalog;
    private final Map<String, String> JAVA_TYPE_TO_MODEL_NAME = new HashMap<>();
    ObjectMapper jsonMapper = new ObjectMapper();

    public CamelCatalogSchemaEnhancer(CamelCatalog camelCatalog) {
        this.camelCatalog = camelCatalog;
        populateJavaTypeToModelNameMap();
    }

    /**
     * Fill the required properties of the model in the schema if they are not already present
     *
     * @param modelName the name of the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void fillRequiredPropertiesIfNeeded(String modelName, ObjectNode modelNode) {
        EipModel model = camelCatalog.eipModel(modelName);
        if (model == null) {
            return;
        }

        fillRequiredPropertiesIfNeeded(model, modelNode);
    }

    /**
     * Fill the required properties of the model in the schema if they are not already present
     *
     * @param model     the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void fillRequiredPropertiesIfNeeded(EipModel model, ObjectNode modelNode) {
        ArrayList<String> requiredProperties = new ArrayList<>();

        if (modelNode.has("required")) {
            modelNode.get("required").elements().forEachRemaining(node -> {
                requiredProperties.add(node.asText());
            });
        }

        model.getOptions().forEach(option -> {
            if (option.isRequired() && !requiredProperties.contains(option.getName())) {
                requiredProperties.add(option.getName());
            }
        });

        if (!requiredProperties.isEmpty()) {
            ArrayNode requiredNode = modelNode.putArray("required");
            requiredProperties.forEach(requiredNode::add);
        }
    }

    /**
     * Sort schema properties according to the Camel catalog
     *
     * @param modelName the name of the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void sortPropertiesAccordingToCatalog(String modelName, ObjectNode modelNode) {
        EipModel model = camelCatalog.eipModel(modelName);
        if (model == null) {
            return;
        }

        sortPropertiesAccordingToCatalog(model, modelNode);
    }

    /**
     * Sort schema properties according to the Camel catalog
     *
     * @param model     the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void sortPropertiesAccordingToCatalog(EipModel model, ObjectNode modelNode) {
        var modelNodeProperties = modelNode.withObject("/properties").properties().stream()
                .map(Map.Entry::getKey).sorted(
                        new CamelYamlDSLKeysComparator(model.getOptions()))
                .toList();
        var sortedSchemaProperties = jsonMapper.createObjectNode();

        for (var propertyName : modelNodeProperties) {
            var propertySchema = modelNode.withObject("/properties")
                    .withObject("/" + propertyName);
            sortedSchemaProperties.set(propertyName, propertySchema);
        }
        modelNode.set("properties", sortedSchemaProperties);
    }

    /**
     * Fill the group/label information of the model in the schema
     *
     * @param modelName the name of the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void fillPropertiesInformation(String modelName, ObjectNode modelNode) {
        EipModel model = camelCatalog.eipModel(modelName);
        if (model == null) {
            return;
        }

        fillPropertiesInformation(model, modelNode);
    }

    /**
     * Fill the group/label information of the model in the schema
     *
     * @param model     the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void fillPropertiesInformation(EipModel model, ObjectNode modelNode) {
        List<EipModel.EipOptionModel> modelOptions = model.getOptions();

        modelNode.withObject("properties").fields().forEachRemaining(entry -> {
            String propertyName = entry.getKey();
            ObjectNode propertyNode = (ObjectNode) entry.getValue();
            if (propertyNode.isEmpty()) {
                return;
            }

            Optional<EipModel.EipOptionModel> modelOption =
                    modelOptions.stream().filter(option -> option.getName().equals(propertyName)).findFirst();
            if (modelOption.isEmpty()) {
                return;
            }

            addGroupInfo(modelOption.get(), propertyNode);
            addFormatInfo(modelOption.get(), propertyNode);
        });
    }

    /**
     * Get the Camel model by its Java type
     *
     * @param javaType the Java type string of the Camel model, e.g. "org.apache.camel.language.simple.SimpleExpression"
     * @return the Camel model
     */
    EipModel getCamelModelByJavaType(String javaType) {
        return camelCatalog.eipModel(JAVA_TYPE_TO_MODEL_NAME.get(javaType));
    }

    /**
     * Populate the JavaType to ModelName map
     */
    private void populateJavaTypeToModelNameMap() {
        camelCatalog.findModelNames().forEach(modelName -> {
            EipModel model = camelCatalog.eipModel(modelName);
            if (model != null) {
                JAVA_TYPE_TO_MODEL_NAME.put(model.getJavaType(), modelName);
            }
        });
    }

    private void addGroupInfo(EipModel.EipOptionModel modelOption, ObjectNode propertyNode) {
        String group =
                modelOption.getGroup() != null ? modelOption.getGroup() : modelOption.getLabel();
        if (group == null) {
            return;
        }

        if (propertyNode.has("$comment")) {
            propertyNode.put("$comment", propertyNode.get("$comment").asText() + "|group:" + group);
        } else {
            propertyNode.put("$comment", "group:" + group);
        }
    }

    private void addFormatInfo(EipModel.EipOptionModel modelOption, ObjectNode propertyNode) {
        String bean =
                "object".equals(modelOption.getType()) && !propertyNode.has("$ref") ?  modelOption.getJavaType() : null;
        if (bean == null) {
            return;
        }

        if (propertyNode.has("format")) {
            propertyNode.put("format", propertyNode.get("format").asText() + "|bean:" + modelOption.getJavaType());
        } else {
            propertyNode.put("format", "bean:" + modelOption.getJavaType());
        }
    }
}
