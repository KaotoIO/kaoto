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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

public class EIPGenerator implements Generator {
    CamelCatalog camelCatalog;
    CamelCatalogSchemaEnhancer camelCatalogSchemaEnhancer;
    String camelYamlSchema;
    ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    ObjectNode camelYamlSchemaNode;
    CamelYAMLSchemaReader camelYAMLSchemaReader;

    public EIPGenerator(CamelCatalog camelCatalog, String camelYamlSchema) throws JsonProcessingException {
        this.camelCatalog = camelCatalog;
        this.camelCatalogSchemaEnhancer = new CamelCatalogSchemaEnhancer(camelCatalog);
        this.camelYamlSchema = camelYamlSchema;
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
        Map<String, ObjectNode> eipMap = new LinkedHashMap<>();

        getEIPNames().forEach(eipName -> {
            var eipJSON = getEIPJson(eipName);
            var eipJSONSchema = camelYAMLSchemaReader.getJSONSchema(eipName);
            eipJSON.set("propertiesSchema", eipJSONSchema);

            camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(Kind.eip, eipName, eipJSONSchema);
            camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(eipName, eipJSONSchema);
            camelCatalogSchemaEnhancer.fillPropertiesInformation(eipName, eipJSONSchema);
            iterateOverDefinitions(eipJSONSchema.withObject("definitions"), (model, node) -> {
                if (model == null) {
                    return;
                }

                camelCatalogSchemaEnhancer.fillRequiredPropertiesIfNeeded(model, node);
                camelCatalogSchemaEnhancer.sortPropertiesAccordingToCatalog(model, node);
                camelCatalogSchemaEnhancer.fillPropertiesInformation(model, node);
            });

            eipMap.put(eipName, eipJSON);
        });

        return eipMap;
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
        var iterator = this.camelYamlSchemaNode.get("items").get("definitions")
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .fields();

        List<String> eipNames = new ArrayList<>();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            eipNames.add(entry.getKey());
        }

        return eipNames;
    }

    /**
     * Get the JSON model of an EIP
     *
     * @param eipName the name of the EIP, e.g. "to", "setHeader"
     * @return the JSON model of the EIP including its properties
     */
    ObjectNode getEIPJson(String eipName) {
        String eipJson = camelCatalog.modelJSonSchema(eipName);

        try {
            return (ObjectNode) jsonMapper.readTree(eipJson);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(String.format("Cannot load %s JSON model", eipName), e);
        }
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
