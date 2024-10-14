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
package io.kaoto.camelcatalog.generator;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.StringWriter;
import java.util.*;

/**
 * Process camelYamlDsl.json file, aka Camel YAML DSL JSON schema.
 */
public class CamelYamlDslSchemaProcessor {
    private static final String PROCESSOR_DEFINITION = "org.apache.camel.model.ProcessorDefinition";
    private static final String TOKENIZER_DEFINITION = "org.apache.camel.model.TokenizerDefinition";
    private static final String ROUTE_CONFIGURATION_DEFINITION = "org.apache.camel.model.RouteConfigurationDefinition";
    private static final String LOAD_BALANCE_DEFINITION = "org.apache.camel.model.LoadBalanceDefinition";
    private static final String EXPRESSION_SUB_ELEMENT_DEFINITION =
            "org.apache.camel.model.ExpressionSubElementDefinition";
    private static final String SAGA_DEFINITION = "org.apache.camel.model.SagaDefinition";
    private static final String PROPERTY_EXPRESSION_DEFINITION = "org.apache.camel.model.PropertyExpressionDefinition";
    private static final String ERROR_HANDLER_DEFINITION = "org.apache.camel.model.ErrorHandlerDefinition";
    private static final String ERROR_HANDLER_DESERIALIZER =
            "org.apache.camel.dsl.yaml.deserializers.ErrorHandlerBuilderDeserializer";
    private final ObjectMapper jsonMapper;
    private final ObjectNode yamlDslSchema;
    private final List<String> processorBlocklist = List.of("org.apache.camel.model.KameletDefinition");

    /**
     * The processor properties those should be handled separately, i.e. remove from
     * the properties schema,
     * such as branching node and parameters reflected from the underlying
     * components.
     */
    private final Map<String, List<String>> processorPropertyBlockList = Map.of(
            "org.apache.camel.model.ChoiceDefinition",
            List.of("when", "otherwise"),
            "org.apache.camel.model.TryDefinition",
            List.of("doCatch", "doFinally"),
            "org.apache.camel.model.ToDefinition",
            List.of("uri", "parameters"),
            "org.apache.camel.model.WireTapDefinition",
            List.of("uri", "parameters"));
    private final List<String> processorReferenceBlockList = List.of(PROCESSOR_DEFINITION);

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
            ObjectNode rootSchema) {
        var answer = (ObjectNode) prop.getValue().deepCopy();
        if (answer.has("$ref") && definitions.has(getNameFromRef(answer))) {
            answer = definitions.withObject("/" + getNameFromRef(answer)).deepCopy();
        }

        extractSingleOneOfFromAnyOf(answer);
        removeEmptyProperties(answer);
        removeNotFromOneOf(answer);
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

    /**
     * Remove the empty properties from the definition, as it's not supported by the
     * form library. This happens when the properties are supposed to be handled
     * separately, in a oneOf definition, for example.
     * An example:
     * ```
     * {
     * properties: {
     * deadLetterChannel: { },
     * defaultErrorHandler: { }
     * }
     * }
     *
     * @param definitionWithEmptyProperties the definition containing the empty properties to be removed
     */
    private void removeEmptyProperties(ObjectNode definitionWithEmptyProperties) {
        if (!definitionWithEmptyProperties.has("properties")) {
            return;
        }

        var propertiesObject = definitionWithEmptyProperties.withObject("/properties");
        List<String> propToRemove = new ArrayList<>();
        propertiesObject.fields().forEachRemaining(field -> {
            if (field.getValue().isEmpty()) {
                propToRemove.add(field.getKey());
            }
        });
        propToRemove.forEach(propertiesObject::remove);
    }

    /**
     * Remove "not" from the OneOf definition, as it's not supported by the
     * form library. The "not" is only useful for the Source code editor.
     *
     * @param definitionContainingOneOf the definition to be cleaned
     */
    private void removeNotFromOneOf(ObjectNode definitionContainingOneOf) {
        if (!definitionContainingOneOf.has("oneOf")) {
            return;
        }

        ArrayNode cleanAnyOf = jsonMapper.createArrayNode();
        var oneOfDefinitionArray = definitionContainingOneOf.withArray("/oneOf");
        for (var def : oneOfDefinitionArray) {
            if (def.has("not")) {
                continue;
            }
            cleanAnyOf.add(def);
        }
        definitionContainingOneOf.set("oneOf", cleanAnyOf);
    }

    private String getNameFromRef(ObjectNode parent) {
        var ref = parent.get("$ref").asText();
        return ref.contains("items") ? ref.replace("#/items/definitions/", "")
                : ref.replace("#/definitions/", "");
    }

    private void populateDefinitions(ObjectNode schema, ObjectNode definitions) {
        boolean added = true;
        while (added) {
            added = false;
            for (JsonNode refParent : schema.findParents("$ref")) {
                var name = getNameFromRef((ObjectNode) refParent);
                if (processorReferenceBlockList.contains(name)) {
                    continue;
                }
                if (!schema.has("definitions") || !schema.withObject("/definitions").has(name)) {
                    var schemaDefinitions = schema.withObject("/definitions");
                    schemaDefinitions.set(name, definitions.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }

    /**
     * Extract single OneOf definition from AnyOf definition and put it into the
     * root definitions.
     * It's a workaround for the current Camel YAML DSL JSON schema, where some
     * AnyOf definition
     * contains only one OneOf definition.
     * This is done mostly for the errorHandler definition, f.i.
     * ```
     * {
     * anyOf: [
     * {
     * oneOf: [
     * { type: "object", ... },
     * { type: "object", ... },
     * ]
     * },
     * ]
     * }
     * ```
     * will be transformed into
     * ```
     * {
     * oneOf: [
     * { type: "object", ... },
     * { type: "object", ... },
     * ]
     * }
     */
    private void extractSingleOneOfFromAnyOf(ObjectNode definition) {
        if (!definition.has("anyOf")) {
            return;
        }
        var anyOfArray = definition.withArray("/anyOf");
        if (anyOfArray.size() != 1) {
            return;
        }

        var anyOfOneOf = anyOfArray.get(0).withArray("/oneOf");
        definition.set("oneOf", anyOfOneOf);
        definition.remove("anyOf");
    }

    /**
     * Extract the processor definitions from the main Camel YAML DSL JSON schema in
     * the usable
     * format for uniforms to render the configuration form. It does a couple of
     * things:
     * <ul>
     * <li>Remove "oneOf" and "anyOf"</li>
     * <li>Remove properties those are supposed to be handled separately:
     * <ul>
     * <li>"steps": branching steps</li>
     * <li>"parameters": component parameters</li>
     * <li>expression languages</li>
     * <li>dataformats</li>
     * </ul>
     * </li>
     * <li>If the processor is expression aware, it puts "expression" as a
     * "$comment" in the schema</li>
     * <li>If the processor is dataformat aware, it puts "dataformat" as a
     * "$comment" in the schema</li>
     * <li>If the processor property is expression aware, it puts "expression" as a
     * "$comment" in the property schema</li>
     * </ul>
     *
     * @return A map of processor definitions
     */
    public Map<String, ObjectNode> getProcessors() throws Exception {
        var definitions = yamlDslSchema
                .withObject("/items")
                .withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        var processors = relocatedDefinitions
                .withObject(PROCESSOR_DEFINITION)
                .withObject("/properties");
        addRouteConfigurationProcessors(relocatedDefinitions, processors);

        var answer = new LinkedHashMap<String, ObjectNode>();
        for (var processorEntry : processors) {
            var processorFQCN = getNameFromRef((ObjectNode) processorEntry);
            if (processorBlocklist.contains(processorFQCN)) {
                continue;
            }
            var processor = relocatedDefinitions.withObject("/" + processorFQCN);
            processor = extractFromOneOf(processorFQCN, processor);
            processor.remove("oneOf");

            /* Preparation for TokenizerDefinition, this could be propagated to all EIPs in the future */
            if (processorFQCN.equals(TOKENIZER_DEFINITION)) {
                removeEmptyProperties(processor);
                extractSingleOneOfFromAnyOf(processor);
                removeNotFromOneOf(processor);
            }

            processAndRemoveAnyOfForSubCatalogs(processorFQCN, processor);

            var processorProperties = processor.withObject("/properties");
            Set<String> propToRemove = new HashSet<>();
            var propertyBlockList = processorPropertyBlockList.get(processorFQCN);
            for (var propEntry : processorProperties.properties()) {
                var propName = propEntry.getKey();
                if (propertyBlockList != null && propertyBlockList.contains(propName)) {
                    propToRemove.add(propName);
                    continue;
                }

                var property = (ObjectNode) propEntry.getValue();
                var refParent = property.findParent("$ref");
                if (refParent != null) {
                    var ref = getNameFromRef(refParent);
                    if (processorReferenceBlockList.contains(ref)) {
                        if (processor.has("$comment")) {
                            processor.put("$comment", processor.get("$comment").asText() + ",steps");
                        } else {
                            processor.put("$comment", "steps");
                        }
                        propToRemove.add(propName);
                    }
                    if (EXPRESSION_SUB_ELEMENT_DEFINITION.equals(ref)) {
                        refParent.remove("$ref");
                        refParent.put("type", "object");
                        refParent.put("$comment", "expression");
                    }
                    continue;
                }
                if (!property.has("type")) {
                    // inherited properties, such as for expression - supposed to be handled
                    // separately
                    propToRemove.add(propName);
                }
            }
            propToRemove.forEach(processorProperties::remove);
            populateDefinitions(processor, relocatedDefinitions);
            sanitizeDefinitions(processorFQCN, processor);
            processor.put("$schema", "http://json-schema.org/draft-07/schema#");
            answer.put(processorFQCN, processor);
        }
        return answer;
    }

    private void addRouteConfigurationProcessors(ObjectNode relocatedDefinitions, ObjectNode processors) {
        var routeConfigurationProcessor = relocatedDefinitions
                .withObject(ROUTE_CONFIGURATION_DEFINITION)
                .withObject("/properties");
        var interceptProcessor = routeConfigurationProcessor.withObject("intercept").withObject("items")
                .withObject("properties");
        var interceptFromProcessor = routeConfigurationProcessor.withObject("interceptFrom").withObject("items")
                .withObject("properties");
        var interceptSendToEndpointProcessor = routeConfigurationProcessor.withObject("interceptSendToEndpoint")
                .withObject("items").withObject("properties");
        var onExceptionProcessor = routeConfigurationProcessor.withObject("onException").withObject("items")
                .withObject("properties");
        var onCompletionProcessor = routeConfigurationProcessor.withObject("onCompletion").withObject("items")
                .withObject("properties");
        processors.setAll(interceptProcessor);
        processors.setAll(interceptFromProcessor);
        processors.setAll(interceptSendToEndpointProcessor);
        processors.setAll(onExceptionProcessor);
        processors.setAll(onCompletionProcessor);
    }

    private ObjectNode extractFromOneOf(String name, ObjectNode definition) throws Exception {
        if (!definition.has("oneOf")) {
            return definition;
        }
        var oneOf = definition.withArray("/oneOf");
        if (oneOf.size() != 2) {
            throw new Exception(String.format(
                    "Definition '%s' has '%s' entries in oneOf unexpectedly, look it closer",
                    name,
                    oneOf.size()));
        }
        for (var def : oneOf) {
            if (def.get("type").asText().equals("object")) {
                var objectDef = (ObjectNode) def;
                if (definition.has("title")) {
                    objectDef.set("title", definition.get("title"));
                }
                if (definition.has("description")) {
                    objectDef.set("description", definition.get("description"));
                }
                return objectDef;
            }
        }
        throw new Exception(String.format(
                "Definition '%s' oneOf doesn't have object entry unexpectedly, look it closer",
                name));
    }

    /**
     * Process the "anyOf" definition for the sub-catalogs, such as expressions, languages,
     * data formats, and errorHandler.
     * It puts a "$comment" in the schema to indicate the type of the sub-catalog and then removes
     * the "anyOf" definition.
     *
     * @param name       the FQCN of the definition, for instance "org.apache.camel.model.LoadBalanceDefinition"
     * @param definition the definition that potentially could have "anyOf" definition, referencing to another
     *                   sub-catalogs
     */
    private void processAndRemoveAnyOfForSubCatalogs(String name, ObjectNode definition) {
        if (!definition.has("anyOf")) {
            return;
        }
        var anyOfOneOf = definition.withArray("/anyOf").get(0).withArray("/oneOf");
        for (var def : anyOfOneOf) {
            if (def.has("$ref") && def.get("$ref").asText()
                    .equals("#/definitions/org.apache.camel.model.language.ExpressionDefinition")) {
                definition.put("$comment", "expression");
                break;
            }
            var refParent = def.findParent("$ref");
            if (refParent != null
                    && refParent.get("$ref").asText().startsWith("#/definitions/org.apache.camel.model.dataformat")) {
                definition.put("$comment", "dataformat");
                break;
            }
            if (LOAD_BALANCE_DEFINITION.equals(name)) {
                definition.put("$comment", "loadbalance");
                break;
            }
            if (List.of(ERROR_HANDLER_DEFINITION, ERROR_HANDLER_DESERIALIZER).contains(name)) {
                definition.put("$comment", "errorhandler");
                break;
            }
        }
        definition.remove("anyOf");
    }

    private void sanitizeDefinitions(String processorFQCN, ObjectNode processor) throws Exception {
        if (!processor.has("definitions")) {
            return;
        }
        var definitions = processor.withObject("/definitions");
        var defToRemove = new HashSet<String>();
        for (var entry : definitions.properties()) {
            var definitionName = entry.getKey();
            if (SAGA_DEFINITION.equals(processorFQCN) && definitionName.startsWith("org.apache.camel.language")) {
                defToRemove.add(definitionName);
                continue;
            }

            var definition = (ObjectNode) entry.getValue();
            definition = extractFromOneOf(definitionName, definition);
            processAndRemoveAnyOfForSubCatalogs(definitionName, definition);
            var definitionProperties = definition.withObject("/properties");
            var propToRemove = new HashSet<String>();
            for (var property : definitionProperties.properties()) {
                var propName = property.getKey();
                var propValue = property.getValue();
                if (!propValue.has("$ref") && !propValue.has("type")) {
                    // inherited properties, such as for expression - supposed to be handled
                    // separately
                    propToRemove.add(propName);
                }

            }
            propToRemove.forEach(definitionProperties::remove);
            if (PROPERTY_EXPRESSION_DEFINITION.equals(definitionName)) {
                var expression = definition.withObject("/properties").withObject("/expression");
                expression.put("title", "Expression");
                expression.put("type", "object");
                expression.put("$comment", "expression");
            }
            definitions.set(definitionName, definition);
        }
        defToRemove.forEach(definitions::remove);
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
            // Could this happen in the future? If so, we need to prepare separate sets for
            // marshal and unmarshal
            throw new Exception("Marshal and Unmarshal dataformats are not the same size");
        }

        var answer = new LinkedHashMap<String, ObjectNode>();
        for (var entry : fromMarshal) {
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
                populateDefinitions(dataformat, relocatedDefinitions);
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
                    populateDefinitions(objectDef, relocatedDefinitions);
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
        for (var entry : languages) {
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
                populateDefinitions(language, relocatedDefinitions);
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
                    populateDefinitions(objectDef, relocatedDefinitions);
                    answer.put(entryName, (ObjectNode) def);
                    break;
                }
            }
        }
        return answer;
    }

    /**
     * Extract the entity definitions from the main Camel YAML DSL JSON schema in
     * the usable
     * format for uniforms to render the configuration form. "entity" here means the
     * top level
     * properties in Camel YAML DSL, such as "route", "rest", "beans",
     * "routeConfiguration", etc.
     * They are marked with "@YamlIn" annotation in the Camel codebase.
     * It does a couple of things:
     * <li>Remove "oneOf" and "anyOf"</li>
     * <li>Remove properties those are supposed to be handled separately:
     * <ul>
     * <li>"steps": branching steps</li>
     * <li>"parameters": component parameters</li>
     * <li>expression languages</li>
     * <li>dataformats</li>
     * </ul>
     * </li>
     * <li>If the processor is expression aware, it puts "expression" as a
     * "$comment" in the schema</li>
     * <li>If the processor is dataformat aware, it puts "dataformat" as a
     * "$comment" in the schema</li>
     * <li>If the processor property is expression aware, it puts "expression" as a
     * "$comment" in the property schema</li>
     *
     * @return A map of the entity name and the schema
     */
    public Map<String, ObjectNode> getEntities() throws Exception {
        var definitions = yamlDslSchema
                .withObject("/items")
                .withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        var yamlIn = yamlDslSchema
                .withObject("/items")
                .withObject("/properties");

        var answer = new LinkedHashMap<String, ObjectNode>();
        for (var yamlInRef : yamlIn.properties()) {
            var yamlInName = yamlInRef.getKey();
            var yamlInRefValue = (ObjectNode) yamlInRef.getValue();
            var yamlInFQCN = getNameFromRef(yamlInRefValue);
            var yamlInDefinition = relocatedDefinitions.withObject("/" + yamlInFQCN);
            yamlInDefinition = extractFromOneOf(yamlInFQCN, yamlInDefinition);
            yamlInDefinition.remove("oneOf");
            processAndRemoveAnyOfForSubCatalogs(yamlInFQCN, yamlInDefinition);
            Set<String> propToRemove = new HashSet<>();
            var yamlInProperties = yamlInDefinition.withObject("/properties");
            for (var yamlInPropertyEntry : yamlInProperties.properties()) {
                var propertyName = yamlInPropertyEntry.getKey();
                var property = (ObjectNode) yamlInPropertyEntry.getValue();
                var refParent = property.findParent("$ref");
                if (refParent != null) {
                    var ref = getNameFromRef(refParent);
                    if (processorReferenceBlockList.contains(ref)) {
                        if (yamlInDefinition.has("$comment")) {
                            yamlInDefinition.put("$comment", yamlInDefinition.get("$comment").asText() + ",steps");
                        } else {
                            yamlInDefinition.put("$comment", "steps");
                        }
                        propToRemove.add(propertyName);
                    }
                    if (EXPRESSION_SUB_ELEMENT_DEFINITION.equals(ref)) {
                        refParent.remove("$ref");
                        refParent.put("type", "object");
                        refParent.put("$comment", "expression");
                    }
                    continue;
                }
                if (!property.has("type")) {
                    // inherited properties, such as for expression - supposed to be handled
                    // separately
                    propToRemove.add(propertyName);
                }
            }
            propToRemove.forEach(yamlInProperties::remove);
            populateDefinitions(yamlInDefinition, relocatedDefinitions);
            sanitizeDefinitions(yamlInFQCN, yamlInDefinition);
            yamlInDefinition.put("$schema", "http://json-schema.org/draft-07/schema#");
            answer.put(yamlInName, yamlInDefinition);
        }
        return answer;
    }

    public Map<String, ObjectNode> getLoadBalancers() throws Exception {
        var definitions = yamlDslSchema
                .withObject("/items")
                .withObject("/definitions");
        var relocatedDefinitions = relocateToRootDefinitions(definitions);
        var loadBalancerAnyOfOneOf = relocatedDefinitions
                .withObject("/" + LOAD_BALANCE_DEFINITION)
                .withArray("/anyOf").get(0)
                .withArray("/oneOf");

        var answer = new LinkedHashMap<String, ObjectNode>();
        for (var entry : loadBalancerAnyOfOneOf) {
            if (entry.has("not")) {
                continue;
            }
            if (!"object".equals(entry.get("type").asText()) || !entry.has("required")) {
                throw new Exception("Unexpected loadbalancer entry " + entry.asText());
            }
            var entryName = entry.withArray("/required").get(0).asText();
            var property = entry
                    .withObject("/properties")
                    .withObject("/" + entryName);
            var entryDefinitionName = getNameFromRef(property);
            var loadBalancer = relocatedDefinitions.withObject("/" + entryDefinitionName);
            if (loadBalancer.has("oneOf")) {
                var lbOneOf = loadBalancer.withArray("/oneOf");
                if (lbOneOf.size() != 2) {
                    throw new Exception(String.format(
                            "LoadBalancer '%s' has '%s' entries in oneOf unexpectedly, look it closer",
                            entryDefinitionName,
                            lbOneOf.size()));
                }
                for (var def : lbOneOf) {
                    if (def.get("type").asText().equals("object")) {
                        var objectDef = (ObjectNode) def;
                        objectDef.set("title", loadBalancer.get("title"));
                        objectDef.set("description", loadBalancer.get("description"));
                        loadBalancer = objectDef;
                        break;
                    }
                }
            }
            populateDefinitions(loadBalancer, relocatedDefinitions);
            for (var prop : loadBalancer.withObject("/properties").properties()) {
                var propertyDef = (ObjectNode) prop.getValue();
                var refParent = propertyDef.findParent("$ref");
                if (refParent != null) {
                    var ref = getNameFromRef(refParent);
                    if (EXPRESSION_SUB_ELEMENT_DEFINITION.equals(ref)) {
                        refParent.remove("$ref");
                        refParent.put("type", "object");
                        refParent.put("$comment", "expression");
                    }
                }
            }
            answer.put(entryName, loadBalancer);
        }
        return answer;
    }
}
