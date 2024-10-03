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

import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

public class KameletProcessor {
    private static final List<String> TO_STRING_TYPES = List.of("binary");

    public static void process(ObjectNode kamelet) {
        var schema = kamelet.withObject("/propertiesSchema");
        var kameletDef = kamelet.withObject("/spec")
                .withObject("/definition");
        schema.put("$schema", "http://json-schema.org/draft-07/schema#");
        schema.put("type", "object");
        if (kameletDef.has("title")) schema.set("title", kameletDef.get("title"));
        if (kameletDef.has("description")) schema.set("description", kameletDef.get("description"));
        if (kameletDef.has("required")) schema.set("required", kameletDef.get("required"));
        if (kameletDef.has("properties") && !kameletDef.withObject("/properties").isEmpty()) {
            var kameletProperties = kameletDef.withObject("/properties");
            var schemaProperties = schema.withObject("/properties");
            for (var entry : kameletProperties.properties()) {
                var name = entry.getKey();
                var property = entry.getValue();
                var schemaProperty = schemaProperties.withObject("/" + name);
                if (property.has("type")) schemaProperty.set("type", property.get("type"));
                if (TO_STRING_TYPES.contains(property.get("type").asText())) {
                    schemaProperty.put("$comment", "type:" + property.get("type").asText());
                    schemaProperty.put("type", "string");
                }
                if (property.has("title")) schemaProperty.set("title", property.get("title"));
                if (property.has("description")) schemaProperty.set("description", property.get("description"));
                if (property.has("enum")) schemaProperty.set("enum", property.get("enum"));
                if (property.has("default")) schemaProperty.set("default", property.get("default"));
                if (property.has("format")) schemaProperty.set("format", property.get("format"));
            }
        }
    }
}
