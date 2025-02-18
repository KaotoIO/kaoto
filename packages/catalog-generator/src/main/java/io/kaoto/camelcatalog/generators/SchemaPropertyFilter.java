package io.kaoto.camelcatalog.generators;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class SchemaPropertyFilter {

    private final Map<String, List<String>> processorPropertyBlockList;

    public SchemaPropertyFilter() {
        this.processorPropertyBlockList = Map.ofEntries(
            Map.entry("choice", List.of("when", "otherwise")),
            Map.entry("doTry", List.of("doCatch", "doFinally", "steps")),
            Map.entry("to", List.of("parameters")),
            Map.entry("toD", List.of("parameters")),
            Map.entry("wireTap", List.of("parameters")),
            Map.entry("when", List.of("steps")),
            Map.entry("otherwise", List.of("steps")),
            Map.entry("doCatch", List.of("steps")),
            Map.entry("doFinally", List.of("steps")),
            Map.entry("aggregate", List.of("steps")),
            Map.entry("circuitBreaker", List.of("steps")),
            Map.entry("filter", List.of("steps")),
            Map.entry("loadBalance", List.of("steps")),
            Map.entry("loop", List.of("steps")),
            Map.entry("multicast", List.of("steps")),
            Map.entry("onFallback", List.of("steps")),
            Map.entry("pipeline", List.of("steps")),
            Map.entry("resequence", List.of("steps")),
            Map.entry("saga", List.of("steps")),
            Map.entry("split", List.of("steps")),
            Map.entry("step", List.of("steps")),
            Map.entry("whenSkipSendToEndpoint", List.of("steps")),
            Map.entry("get", List.of("to")),
            Map.entry("post", List.of("to")),
            Map.entry("put", List.of("to")),
            Map.entry("delete", List.of("to")),
            Map.entry("head", List.of("to")),
            Map.entry("patch", List.of("to")),
            Map.entry("from", List.of("steps")),
            Map.entry("intercept", List.of("steps")),
            Map.entry("interceptFrom", List.of("steps")),
            Map.entry("interceptSendToEndpoint", List.of("steps")),
            Map.entry("onCompletion", List.of("steps")),
            Map.entry("onException", List.of("steps"))
        );
    }

    void schemaPropertyFilter(String eipName, ObjectNode node) {
        if (!processorPropertyBlockList.containsKey(eipName)) return;

        filterProperties(eipName, node);

        if (node.has("oneOf")) {
            var array = (ArrayNode) node.get("oneOf");
            array.forEach(element -> {
                filterProperties(eipName, (ObjectNode) element);
            });
        }

        if (node.has("anyOf")) {
            var array = (ArrayNode) node.get("anyOf");
            array.forEach(element -> {
                filterProperties(eipName, (ObjectNode) element);
            });
        }
    }

    void filterProperties(String eipName, ObjectNode node) {
        if (node.has("properties")) {
            var properties = (ObjectNode) node.get("properties");
            Set<String> propToRemove = new HashSet<>();
            properties.fields().forEachRemaining(entry -> {
                if (processorPropertyBlockList.get(eipName).contains(entry.getKey())) {
                    propToRemove.add(entry.getKey());
                }
            });
            propToRemove.forEach(properties::remove);
        }
    }

}
