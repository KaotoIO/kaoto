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

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.tooling.model.EipModel;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

public class CamelCatalogSchemaEnhancer {

    private final CamelCatalog camelCatalog;
    private final Map<String, String> JAVA_TYPE_TO_MODEL_NAME = new LinkedHashMap<>();

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
        // TODO: Sort properties according to the Camel catalog
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
}
