package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

public class CamelYAMLSchemaReader {

    ObjectMapper jsonMapper = new ObjectMapper();
    ObjectNode camelYamlSchemaNode;

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




        // TODO: Bring the definitions from the Camel YAML DSL schema
        // See: io.kaoto.camelcatalog.generator.CamelYamlDslSchemaProcessor.relocateToRootDefinitions





//        var resolvedNode = getResolvedNode(eipNodeRef);
//        eipSchemaNode.setAll(resolvedNode);
//
//        setRequiredPropertyIfNeeded(eipSchemaNode);
//        extractSingleOneOfFromAnyOf(eipSchemaNode);
//        inlineDefinitions(eipSchemaNode);


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

            ObjectNode currentNode = camelYamlSchemaNode;
            for (String path : refPath) {
                if (path.equals("#")) {
                    currentNode = camelYamlSchemaNode;
                } else if (!path.isEmpty()) {
                    currentNode = (ObjectNode) currentNode.get(path);
                }
            }

            return currentNode;
        }

        return node;
    }

    /**
     * Initialize the required property if it does not exist
     *
     * @param node the node to set the required property if it does not exist
     */
    void setRequiredPropertyIfNeeded(ObjectNode node) {
        if (!node.has("required")) {
            node.set("required", jsonMapper.createArrayNode());
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
    private void extractSingleOneOfFromAnyOf(ObjectNode node) {
        if (!node.has("anyOf")) {
            return;
        }
        var anyOfArray = node.withArray("/anyOf");
        if (anyOfArray.size() != 1) {
            return;
        }

        var anyOfOneOf = anyOfArray.get(0).withArray("/oneOf");
        node.set("oneOf", anyOfOneOf);
        node.remove("anyOf");
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
    void inlineDefinitions(ObjectNode node) {
        if (!node.has("properties")) {
            return;
        }

        var properties = (ObjectNode) node.get("properties");
        properties.fields().forEachRemaining(entry -> {
            var property = (ObjectNode) entry.getValue();
            if (property.has("$ref")) {
                var resolvedNode = getResolvedNode(property);
                property.setAll(resolvedNode);
                inlineDefinitions(property);
            }
        });
    }
}
