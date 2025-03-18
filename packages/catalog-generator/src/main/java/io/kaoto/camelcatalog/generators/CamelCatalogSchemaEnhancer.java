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
import org.apache.camel.tooling.model.*;

import java.math.BigDecimal;
import java.util.*;

public class CamelCatalogSchemaEnhancer {

    private final CamelCatalog camelCatalog;
    private final Map<String, String> JAVA_TYPE_TO_MODEL_NAME = new HashMap<>();
    private final Map<String, String> MODEL_NAME_TO_JAVA_TYPE = new HashMap<>();
    ObjectMapper jsonMapper = new ObjectMapper();

    public CamelCatalogSchemaEnhancer(CamelCatalog camelCatalog) {
        this.camelCatalog = camelCatalog;
        populateJavaTypeToModelNameMap();
    }

    /**
     * Fill the required properties of the model in the schema if they are not already present
     *
     * @param modelKind the kind of the Camel model
     * @param modelName the name of the Camel model
     * @param modelNode the JSON schema node of the model
     */
    void fillRequiredPropertiesIfNeeded(Kind modelKind, String modelName, ObjectNode modelNode) {
        BaseModel<? extends BaseOptionModel> model = camelCatalog.model(modelKind, modelName);
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
    void fillRequiredPropertiesIfNeeded(BaseModel<? extends BaseOptionModel> model, ObjectNode modelNode) {
        ArrayList<String> requiredProperties = new ArrayList<>();

        if (modelNode.has("required")) {
            modelNode.get("required").elements().forEachRemaining(node -> {
                requiredProperties.add(node.asText());
            });
        }

        List<? extends BaseOptionModel> modelOptions = (model instanceof ComponentModel)
                ? ((ComponentModel) model).getEndpointOptions()
                : model.getOptions();

        modelOptions.forEach(option -> {
            if (option.isRequired() && modelNode.has("properties")
                    && modelNode.get("properties").has(option.getName())
                    && !modelNode.get("properties").get(option.getName()).isEmpty()
                    && !requiredProperties.contains(option.getName())) {
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
     * Fill the group/label/format/deprecated/default information of the model in the schema
     *
     * @param model     the Camel Base model
     * @param modelNode the JSON schema node of the model
     */
    void fillPropertiesInformation(BaseModel<? extends BaseOptionModel> model, ObjectNode modelNode) {
        List<? extends BaseOptionModel> modelOptions = model.getOptions();

        modelNode.withObject("properties").fields().forEachRemaining(entry -> {
            String propertyName = entry.getKey();
            ObjectNode propertyNode = (ObjectNode) entry.getValue();
            if (propertyNode.isEmpty()) {
                return;
            }

            Optional<? extends BaseOptionModel> modelOption =
                    modelOptions.stream().filter(option -> option.getName().equals(propertyName)).findFirst();
            if (modelOption.isEmpty()) {
                return;
            }

            fillPropertyInformation(modelOption.get(), propertyNode);
        });
    }

    /**
     * Fill the group/label/format/deprecated/default information of the model in the property
     *
     * @param modelOption  the Camel Base model
     * @param propertyNode the JSON node of the property
     */
    void fillPropertyInformation(BaseOptionModel modelOption, ObjectNode propertyNode) {
        addTitleAndDescription(modelOption, propertyNode);
        addGroupInfo(modelOption, propertyNode);
        addFormatInfo(modelOption, propertyNode);
        addDeprecateInfo(modelOption, propertyNode);
        addDefaultInfo(modelOption, propertyNode);
    }

    private void addTitleAndDescription(BaseOptionModel modelOption, ObjectNode propertyNode) {
        var displayName = modelOption.getDisplayName();
        if (!propertyNode.has("title") && displayName != null) {
            propertyNode.put("title", displayName);
        }

        var description = modelOption.getDescription();
        if (!propertyNode.has("description") && description != null) {
            propertyNode.put("description", description);
        }
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

    String getJavaTypeByModelName(String modelName) {
        String javaType = MODEL_NAME_TO_JAVA_TYPE.get(modelName);
        if (javaType == null) {
            EipModel model = camelCatalog.eipModel(modelName);
            if (model != null) {
                javaType = model.getJavaType();
                MODEL_NAME_TO_JAVA_TYPE.put(modelName, javaType);
            }
        }
        return javaType;
    }

    /**
     * Fill the JSON schema details of the model in the schema
     *
     * @param modelNode the JSON schema node of the model
     */
    void fillSchemaInformation(ObjectNode modelNode) {
        modelNode.put("$schema", "http://json-schema.org/draft-07/schema#");
        if (!modelNode.has("type")) {
            modelNode.put("type", "object");
        }
    }

    /**
     * Fill the expression format property in the oneOf nodes
     * This is used to provide a hint to the UI that this oneOf
     * is an expression. Example of this is the "setHeader" EIP or the
     * "resequence" EIP
     *
     * @param modelNode the JSON schema node of the model
     */
    void fillExpressionFormatInOneOf(ObjectNode modelNode) {
        if (modelNode.has("anyOf") && modelNode.get("anyOf").isArray()) {
            modelNode.withArray("anyOf").elements().forEachRemaining(node -> {
                fillExpressionFormatInOneOf((ObjectNode) node);
            });
        }

        if (!modelNode.has("oneOf")) {
            return;
        }

        modelNode.withArray("oneOf").elements().forEachRemaining(node -> {
            if (node.has("$ref") && node.get("$ref").asText().contains("org.apache.camel.model.language.ExpressionDefinition")) {
                modelNode.put("format", "expression");
            }
        });
    }

    /**
     * Populate the JavaType to ModelName map
     */
    private void populateJavaTypeToModelNameMap() {
        camelCatalog.findModelNames().forEach(modelName -> {
            EipModel model = camelCatalog.eipModel(modelName);
            if (model != null) {
                JAVA_TYPE_TO_MODEL_NAME.put(model.getJavaType(), modelName);
                MODEL_NAME_TO_JAVA_TYPE.put(modelName, model.getJavaType());
            }
        });
    }

    private void addGroupInfo(BaseOptionModel modelOption, ObjectNode propertyNode) {
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

    private void addFormatInfo(BaseOptionModel modelOption, ObjectNode propertyNode) {
        List<String> format = new ArrayList<>();
        if (propertyNode.has("format")) {
            format.add(propertyNode.get("format").asText());
        }

        var propertyType = modelOption.getType();
        String bean =
                "object".equals(propertyType) && !propertyNode.has("$ref") ? modelOption.getJavaType() : null;

        if (bean != null && !bean.startsWith("java.util.Map")) {
            format.add("bean:" + bean);
            propertyNode.put("type", "string");
        }

        if ("duration".equals(propertyType)) {
            format.add("duration");
            propertyNode.put("type", "string");
        }

        if (modelOption.isSecret()) {
            format.add("password");
        }

        if ("org.apache.camel.model.ExpressionSubElementDefinition".equals(modelOption.getJavaType())) {
            format.add("expressionProperty");
        }

        if (!format.isEmpty()) {
            propertyNode.put("format", String.join("|", format));
        }
    }

    private void addDeprecateInfo(BaseOptionModel modelOption, ObjectNode propertyNode) {
        boolean isDeprecated = modelOption.isDeprecated();
        if (isDeprecated) {
            propertyNode.put("deprecated", true);
        }
    }

    private void addDefaultInfo(BaseOptionModel modelOption, ObjectNode propertyNode) {
        var defaultValue = modelOption.getDefaultValue();
        if (defaultValue != null && !propertyNode.has("default")) {
            var propertyType = modelOption.getType();
            if ("integer".equals(propertyType) && !(defaultValue instanceof String)) {
                propertyNode.put("default", ((BigDecimal) defaultValue).intValue());
            } else if ("boolean".equals(propertyType)) {
                if ("true".equals(defaultValue.toString())) {
                    propertyNode.put("default", true);
                }
            } else {
                propertyNode.put("default", defaultValue.toString());
            }
        }
    }
}
