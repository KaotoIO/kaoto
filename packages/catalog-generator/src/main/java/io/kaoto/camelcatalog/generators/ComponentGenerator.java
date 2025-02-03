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
import org.apache.camel.tooling.model.Kind;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public class ComponentGenerator implements Generator{
    CamelCatalog camelCatalog;
    CamelCatalogSchemaEnhancer camelCatalogSchemaEnhancer;
    ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

    public ComponentGenerator(CamelCatalog camelCatalog) {
        this.camelCatalog = camelCatalog;
        this.camelCatalogSchemaEnhancer = new CamelCatalogSchemaEnhancer(camelCatalog);
    }

    /**
     * Generate the Components map
     *
     * @return the map of Components with the Component name as the key and the JSON model
     * containing the camel JSON model and the JSON schema
     */
    @Override
    public Map<String, ObjectNode> generate() {
        Map<String, ObjectNode> componentMap = new LinkedHashMap<>();

        getComponentNames().forEach(name -> {
            var componentJson = getComponentJson(name);
            var componentJSONSchema = getComponentJSONSchema(name);
            componentJson.set("propertiesSchema", componentJSONSchema);
            camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(Kind.component, name, componentJSONSchema);
            componentMap.put(name, componentJson);
        });
        return componentMap;
    }

    /**
     * Get the list of Component names from the Camel YAML schema
     *
     * @return the list of Component names
     */
    private List<String> getComponentNames() {
        return camelCatalog.findComponentNames().stream().filter(component -> !component.isEmpty()).sorted().toList();
    }

    /**
     * Get the JSON model of a Component
     *
     * @param componentName the name of the Component, e.g. "activemq", "amqp"
     * @return the JSON model of the Component including its properties
     */
    ObjectNode getComponentJson(String componentName) {
        String componentJson = camelCatalog.componentJSonSchema(componentName);

        try {
            return (ObjectNode) jsonMapper.readTree(componentJson);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(String.format("Cannot load %s JSON model", componentName), e);
        }
    }

    /**
     * Get the JSON schema for a given Component
     *
     * @param componentName the name of the Component to get the JSON schema for
     * @return the JSON schema for a given Component, with the details of the properties
     */
    ObjectNode getComponentJSONSchema(String componentName) {
        var componentSchemaNode = jsonMapper.createObjectNode();
        var answerProperties = componentSchemaNode.withObject("/properties");
        var modelOptions = camelCatalog.componentModel(componentName).getEndpointOptions();
        for(var modelOption : modelOptions) {
            var propertyName = modelOption.getName();
            var propertyNode = answerProperties.withObject("/" + propertyName);
            propertyNode.put("title", modelOption.getDisplayName());
            propertyNode.put("description", modelOption.getDescription());
            var propertyType = modelOption.getType();
            propertyNode.put("type", propertyType);

            var enumOption = modelOption.getEnums();
            if (enumOption != null && !enumOption.isEmpty() && !modelOption.isMultiValue()) {
                enumOption.forEach(e -> propertyNode.withArray("/enum").add(e));
                if (!propertyNode.has("type") || "object".equals(propertyNode.get("type").asText())) {
                    propertyNode.put("type", "string");
                }
            } else if ("array".equals(propertyType)) {
                propertyNode.withObject("/items").put("type", "string");
            }

            camelCatalogSchemaEnhancer.fillPropertyInformation(modelOption, propertyNode);
        }

        return componentSchemaNode;
    }
}
