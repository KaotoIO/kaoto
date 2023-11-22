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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.Kind;
import org.apache.camel.tooling.model.ComponentModel;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.JsonMapper;
import org.apache.camel.util.json.JsonObject;

import java.io.StringWriter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Customize Camel Catalog for Kaoto.
 */
public class CamelCatalogProcessor {
    private final ObjectMapper jsonMapper;
    private final DefaultCamelCatalog api;
    private final CamelYamlDslSchemaProcessor schemaProcessor;
    private final ArrayList<String> patternBlocklist;

    public CamelCatalogProcessor(ObjectMapper jsonMapper, CamelYamlDslSchemaProcessor schemaProcessor) {
        this.jsonMapper = jsonMapper;
        this.api = new DefaultCamelCatalog();
        this.schemaProcessor = schemaProcessor;
        patternBlocklist = new ArrayList<>();
        populatePatterBlocklist();
    }

    /**
     * Create Camel catalogs customized for Kaoto usage.
     * @return
     */
    public Map<String, String> processCatalog() throws Exception {
        var answer = new LinkedHashMap<String, String>();
        var componentCatalog = getComponentCatalog();
        var dataFormatCatalog = getDataFormatCatalog();
        var languageCatalog = getLanguageCatalog();
        var modelCatalog = getModelCatalog();
        var patternCatalog = getPatternCatalog();
        answer.put("components", componentCatalog);
        answer.put("dataformats", dataFormatCatalog);
        answer.put("languages", languageCatalog);
        answer.put("models", modelCatalog);
        answer.put("patterns", patternCatalog);
        return answer;
    }

    /**
     * Get aggregated Camel component Catalog.
     * @return
     * @throws Exception
     */
    public String getComponentCatalog() throws Exception {
        var answer = new LinkedHashMap<String, JsonObject>();
        api.findComponentNames().stream().sorted().forEach((name) -> {
            try {
                var model = (ComponentModel) api.model(Kind.component, name);
                answer.put(name, JsonMapper.asJsonObject(model));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        return JsonMapper.serialize(answer);
    }

    /**
     * Get aggregated Camel DataFormat catalog with a custom dataformat added.
     * @return
     * @throws Exception
     */
    public String getDataFormatCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var dataFormatSchemaMap = schemaProcessor.getDataFormats();
        for (var entry : dataFormatSchemaMap.entrySet()) {
            var dataFormatName = entry.getKey();
            var dataFormatSchema = entry.getValue();
            var dataFormatCatalog = (EipModel) api.model(Kind.eip, dataFormatName);
            if (dataFormatCatalog == null) {
                throw new Exception("DataFormat " + dataFormatName + " is not found in Camel model catalog.");
            }
            var json = JsonMapper.asJsonObject(dataFormatCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", dataFormatSchema);
            answer.set(dataFormatName, catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    /**
     * Get Camel language catalog with a custom language added.
     * @return
     * @throws Exception
     */
    public String getLanguageCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var languageSchemaMap = schemaProcessor.getLanguages();
        for (var entry : languageSchemaMap.entrySet()) {
            var languageName = entry.getKey();
            var languageSchema = entry.getValue();
            var languageCatalog = (EipModel) api.model(Kind.eip, languageName);
            if (languageCatalog == null) {
                throw new Exception("Language " + languageName + " is not found in Camel model catalog.");
            }
            var json = JsonMapper.asJsonObject(languageCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", languageSchema);
            answer.set(languageName, catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    public String getModelCatalog() throws Exception {
        var answer = new LinkedHashMap<String, JsonObject>();
        api.findModelNames().stream().sorted().forEach((name) -> {
            try {
                var model = (EipModel) api.model(Kind.eip, name);
                answer.put(name, JsonMapper.asJsonObject(model));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        return JsonMapper.serialize(answer);
    }

    /**
     * Get a Camel processor model catalog filtered from model catalog by comparing with YAML DSL schema.
     * @return
     * @throws Exception
     */
    public String getPatternCatalog() throws Exception {
        var answer = new LinkedHashMap<String, JsonObject>();
        var processors = schemaProcessor.getProcessors();
        api.findModelNames().stream().sorted().forEach((name) -> {
            var model = (EipModel) api.model(Kind.eip, name);
            if (!processors.has(name) || patternBlocklist.contains(name)) {
                return;
            }
            var javaType = schemaProcessor.getProcessorDefinitionFQCN(name);
            if (javaType.equals(model.getJavaType())) {
                answer.put(name, JsonMapper.asJsonObject(model));
            }
        });
        return JsonMapper.serialize(answer);
    }

    private void populatePatterBlocklist() {
        this.patternBlocklist.add("doCatch");
        this.patternBlocklist.add("doFinally");
        this.patternBlocklist.add("kamelet");
        this.patternBlocklist.add("loadBalance");
        this.patternBlocklist.add("onFallback");
        this.patternBlocklist.add("pipeline");
        this.patternBlocklist.add("policy");
        this.patternBlocklist.add("rollback");
        this.patternBlocklist.add("serviceCall");
        this.patternBlocklist.add("setExchangePattern");
        this.patternBlocklist.add("whenSkipSendToEndpoint");
        // reactivate entries once we have a better handling of how to add WHEN and OTHERWISE without Catalog
        //this.patternBlocklist.add("Otherwise");
        //this.patternBlocklist.add("when");
    }
}
