package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class CamelYAMLSchemaReader {

    private final SchemaPropertyFilter schemaPropertyFilter = new SchemaPropertyFilter();
    ObjectMapper jsonMapper = new ObjectMapper();
    ObjectNode camelYamlSchemaNode;

    public CamelYAMLSchemaReader(ObjectNode camelYamlSchemaNode) throws JsonProcessingException {
        this.camelYamlSchemaNode = camelYamlSchemaNode;
    }

    /**
     * Get the JSON schema for a given Entity
     * The Camel YAML DSL schema is a JSON schema that describes the structure of the
     * Camel YAML DSL.
     * The steps are:
     * 1. Get the JSON schema for a given EIP from the Camel catalog
     * 2. Resolve the initial $ref
     * 3. Evaluate all fields recursively and inline all the required definitions
     *
     * @param entityName the name of the EIP to get the JSON schema for
     * @return the JSON schema for a given Entity, with the initial $ref resolved and all the required definitions inlined
     */
    public ObjectNode getEntityJSONSchema(String entityName) {
        var entityNodeRef = (ObjectNode) camelYamlSchemaNode.get("items").get("properties").get(entityName);

        return getJSONSchema(entityName, entityNodeRef);
    }

    /**
     * Get the JSON schema for a given EIP
     * The Camel YAML DSL schema is a JSON schema that describes the structure of the
     * Camel YAML DSL.
     * The steps are:
     * 1. Get the JSON schema for a given EIP from the Camel catalog
     * 2. Resolve the initial $ref
     * 3. Evaluate all fields recursively and inline all the required definitions
     *
     * @param javaType the javaType of the EIP to get the JSON schema for
     * @return the JSON schema for a given Processor, with the initial $ref resolved and all the required definitions inlined
     */
    public ObjectNode getEIPJSONSchema(String eipName, String javaType) {
        var eipJsonSchema = (ObjectNode) camelYamlSchemaNode.get("items")
                .get("definitions")
                .get(javaType)
                .deepCopy();
        return processNodeSchemaObject(eipName, eipJsonSchema);
    }

    /**
     * Get the JSON schema for a given Rest Processor
     * The Camel YAML DSL schema is a JSON schema that describes the structure of the
     * Camel YAML DSL.
     * The steps are:
     * 1. Get the JSON schema for a given Processor from the Camel catalog
     * 2. Resolve the initial $ref
     * 3. Evaluate all fields recursively and inline all the required definitions
     *
     * @param processorName the name of the Processor to get the JSON schema for
     * @return the JSON schema for a given Processor, with the initial $ref resolved and all the required definitions inlined
     */
    public ObjectNode getRestProcessorJSONSchema(String processorName) {
        var processorNodeRef = (ObjectNode) camelYamlSchemaNode.get("items")
                .get("definitions")
                .get("org.apache.camel.model.rest.RestDefinition")
                .get("properties")
                .get(processorName)
                .get("items");

        return getJSONSchema(processorName, processorNodeRef);
    }

    private ObjectNode getJSONSchema(String processorName, ObjectNode processorNodeRef) {
        if (processorNodeRef == null || processorNodeRef.isMissingNode() || !processorNodeRef.has("$ref")) {
            return null;
        }

        var resolvedNode = getResolvedNode(processorNodeRef);
        return this.processNodeSchemaObject(processorName, resolvedNode);

    }

    private ObjectNode processNodeSchemaObject(String processorName, ObjectNode schemaNode) {
        var processorSchemaNode = jsonMapper.createObjectNode();
        var processorSchemaDefinitionsNode = jsonMapper.createObjectNode();

        schemaPropertyFilter.schemaPropertyFilter(processorName, schemaNode);
        processorSchemaNode.setAll(schemaNode);

        inlineDefinitions(processorSchemaNode, processorSchemaDefinitionsNode);
        if (!processorSchemaDefinitionsNode.isEmpty()) {
            processorSchemaNode.set("definitions", processorSchemaDefinitionsNode);
        }

        return processorSchemaNode;
    }

    /**
     * Resolve the initial $ref
     * Given a node, resolve the initial $ref and return the resolved node
     *
     * @param node the node to resolve the initial $ref
     * @return the resolved node
     */
    ObjectNode getResolvedNode(ObjectNode node) {
        if (node.has("$ref")) {
            String ref = node.get("$ref").asText();
            String[] refPath = ref.split("/");

            var definition = camelYamlSchemaNode.deepCopy();
            ObjectNode currentNode = definition;
            for (String path : refPath) {
                if (path.equals("#")) {
                    currentNode = definition;
                } else if (!path.isEmpty()) {
                    currentNode = (ObjectNode) currentNode.get(path);
                }
            }

            return currentNode;
        }

        return node;
    }

    /**
     * Inline all the definitions
     * Given a node, inline the required definitions from the Camel YAML DSL schema if needed.
     * For instance, when a property has a $ref
     * {
     * "property1": {
     * "$ref": "#/definitions/UserDefinition"
     * }
     * }
     * will be transformed into
     * {
     * "user": {
     * "type": "object",
     * "properties": {
     * "name": {
     * "type": "string"
     * }
     *
     * @param node the node to inline the required definitions from the Camel YAML DSL schema
     */
    void inlineDefinitions(ObjectNode node, ObjectNode definitions) {
        if (node.has("type") && "array".equals(node.get("type").asText()) && node.has("items")) {
            var items = (ObjectNode) node.get("items");
            if (items.has("$ref")) {
                addRefDefinition(items, definitions);
            }
        }

        if (node.has("properties")) {
            var properties = (ObjectNode) node.get("properties");
            properties.fields().forEachRemaining(entry -> {
                var property = (ObjectNode) entry.getValue();
                if (property.has("$ref")) {
                    addRefDefinition(property, definitions);
                } else if (property.has("items") && property.get("items").has("$ref") && !entry.getKey().equals("steps")) {
                    var refParent = (ObjectNode) property.get("items");
                    addRefDefinition(refParent, definitions);
                }
            });
        }

        inlineArrayFields(node, "anyOf", definitions);
        inlineArrayFields(node, "oneOf", definitions);
        removeSimpleStringSchemaFromOneOf(node);
    }

    /**
     * Given a node, consolidate the schemas by removing the single string schema from definitions
     * when there's only 2 schemas in the oneOf array.
     * This is a workaround to avoid having a single string schema in the definitions, like
     * in the following case:
     * { oneOf: [ { "type": "string" }, { "type": "object", "properties": { "name": { "type": "string" } } } ] }
     * will be transformed into
     * { "type": "object", "properties": { "name": { "type": "string" } } }
     *
     * @param node the node to consolidate the schemas
     */
    void removeSimpleStringSchemaFromOneOf(ObjectNode node) {
        if (!node.has("oneOf") || node.get("oneOf").size() != 2) {
            return;
        }

        var firstSchema = (ObjectNode) node.get("oneOf").get(0);
        var secondSchema = (ObjectNode) node.get("oneOf").get(1);

        if (firstSchema.has("type") && firstSchema.get("type").asText().equals("string") && secondSchema.has("type") &&
                secondSchema.get("type").asText().equals("object")) {
            node.setAll(secondSchema);
            node.remove("oneOf");
        }
    }

    /**
     * Inline the definitions from an array field
     *
     * @param node        the node to inline the required array field definitions from
     * @param arrayName   the name of the array field, it could be `anyOf` or `oneOf`
     * @param definitions the definitions node to add the inlined definitions
     */
    void inlineArrayFields(ObjectNode node, String arrayName, ObjectNode definitions) {
        if (!node.has(arrayName)) return;

        var array = (ArrayNode) node.get(arrayName);
        array.forEach(element -> {
            if (element.isObject()) {
                var elementNode = (ObjectNode) element;
                if (elementNode.has("$ref")) {
                    addRefDefinition(elementNode, definitions);
                } else {
                    // Recursively process nested objects in the array element
                    inlineDefinitions(elementNode, definitions);
                }
            }
        });
    }

    /**
     * Add the definition from a $ref
     * Given a node with a $ref, add the definition to the definitions node
     * and relocate the $ref from #/items/definitions to #/definitions
     *
     * @param refParent   the node with a $ref
     * @param definitions the definitions node to add the definition
     */
    void addRefDefinition(ObjectNode refParent, ObjectNode definitions) {
        /* ref: #/items/definitions/org.apache.camel.model.ToDefinition */
        String refKey = refParent.get("$ref").asText();

        /* newRefKey: org.apache.camel.model.ToDefinition */
        String newRefKey = refKey.replace("#/items/definitions/", "");

        if (!definitions.has(newRefKey)) {
            var resolvedNode = getResolvedNode(refParent);
            definitions.set(newRefKey, resolvedNode);
            inlineDefinitions(resolvedNode, definitions);
        }

        /* Relocating the $ref from #/items/definitions to #/definitions */
        String newRefLocation = refKey.replace("#/items/definitions/", "#/definitions/");
        refParent.put("$ref", newRefLocation);
    }
}
