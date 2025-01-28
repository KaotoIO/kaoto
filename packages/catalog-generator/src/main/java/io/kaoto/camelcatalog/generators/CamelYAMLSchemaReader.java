package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class CamelYAMLSchemaReader {

    ObjectMapper jsonMapper = new ObjectMapper();
    ObjectNode camelYamlSchemaNode;
    private final SchemaPropertyFilter schemaPropertyFilter = new SchemaPropertyFilter();

    public CamelYAMLSchemaReader(ObjectNode camelYamlSchemaNode) throws JsonProcessingException {
        this.camelYamlSchemaNode = camelYamlSchemaNode;
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
     * @param eipName the name of the EIP to get the JSON schema for
     * @return the JSON schema for a given EIP, with the initial $ref resolved and all the required definitions inlined
     */
    public ObjectNode getJSONSchema(String eipName) {
        var eipNodeRef = (ObjectNode) camelYamlSchemaNode.get("items")
                .get("definitions")
                .get("org.apache.camel.model.ProcessorDefinition")
                .get("properties")
                .get(eipName);
        if (eipNodeRef.isNull() || !eipNodeRef.has("$ref")) {
            return null;
        }

        var eipSchemaNode = jsonMapper.createObjectNode();
        var eipSchemaDefinitionsNode = jsonMapper.createObjectNode();

        var resolvedNode = getResolvedNode(eipNodeRef);

        schemaPropertyFilter.schemaPropertyFilter(eipName, resolvedNode);
        eipSchemaNode.setAll(resolvedNode);

        inlineDefinitions(eipSchemaNode, eipSchemaDefinitionsNode);
        eipSchemaNode.set("definitions", eipSchemaDefinitionsNode);

        return eipSchemaNode;
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

        if (node.has("properties")) {
            var properties = (ObjectNode) node.get("properties");
            properties.fields().forEachRemaining(entry -> {
                var property = (ObjectNode) entry.getValue();
                if (property.has("$ref")) {
                    addRefDefinition(property, definitions);
                } else if (property.has("items") && property.get("items").has("$ref") && !entry.getKey().equals("steps")) {
                    var refParent = (ObjectNode)  property.get("items");
                    addRefDefinition(refParent, definitions);
                }
            });
        }

        inlineArrayFields(node, "anyOf", definitions);
        inlineArrayFields(node, "oneOf", definitions);
    }

    private void inlineArrayFields(ObjectNode node, String arrayName, ObjectNode definitions) {
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

    private void addRefDefinition(ObjectNode refParent, ObjectNode definitions) {
        var newRefKey = refParent.get("$ref").asText().replace("#/items/definitions/", "");
        if (!definitions.has(newRefKey)) {
            var resolvedNode = getResolvedNode(refParent);
            definitions.set(newRefKey, resolvedNode);
            inlineDefinitions(resolvedNode, definitions);
        }
        refParent.put("$ref", refParent.get("$ref").asText().replace("#/items/definitions/", "#/definitions/"));
    }
}
