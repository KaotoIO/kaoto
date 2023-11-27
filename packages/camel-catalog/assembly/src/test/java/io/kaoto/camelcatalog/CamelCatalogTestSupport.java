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
package io.kaoto.camelcatalog;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.nio.file.Paths;

public abstract class CamelCatalogTestSupport {
    protected static final ObjectMapper jsonMapper = new ObjectMapper();
    protected static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    protected static final JsonFactory jsonFactory = new JsonFactory();

    private static ObjectNode index = null;

    protected ObjectNode getIndex() throws Exception {
        if (CamelCatalogTestSupport.index == null) {
            var path = Paths.get("..").resolve("dist").resolve("index.json");
            CamelCatalogTestSupport.index = (ObjectNode) jsonMapper.readTree(path.toFile());
        }
        return CamelCatalogTestSupport.index;
    }

    protected ObjectNode getSchema(String name) throws Exception {
        var schema = getIndex().withObject("/schemas").withObject("/" + name);
        return (ObjectNode) jsonMapper.readTree(
                Paths.get("..").resolve("dist").resolve(schema.get("file").asText()).toFile());
    }

    protected ObjectNode getCatalog(String name) throws Exception {
        var catalog = getIndex().withObject("/catalogs").withObject("/" + name);
        return (ObjectNode) jsonMapper.readTree(
                Paths.get("..").resolve("dist").resolve(catalog.get("file").asText()).toFile());
    }
}
