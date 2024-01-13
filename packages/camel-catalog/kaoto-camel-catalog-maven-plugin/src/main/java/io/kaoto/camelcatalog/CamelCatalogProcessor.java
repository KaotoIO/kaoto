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

import java.io.InputStream;
import java.io.StringWriter;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * Customize Camel Catalog for Kaoto.
 */
public class CamelCatalogProcessor {
    private static final String TO_DYNAMIC_DEFINITION = "org.apache.camel.model.ToDynamicDefinition";
    private static final String SET_HEADERS_DEFINITION = "org.apache.camel.model.SetHeadersDefinition";
    private final ObjectMapper jsonMapper;
    private final DefaultCamelCatalog api;
    private final CamelYamlDslSchemaProcessor schemaProcessor;

    public CamelCatalogProcessor(ObjectMapper jsonMapper, CamelYamlDslSchemaProcessor schemaProcessor) {
        this.jsonMapper = jsonMapper;
        this.api = new DefaultCamelCatalog();
        this.schemaProcessor = schemaProcessor;
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
        var entityCatalog = getEntityCatalog();
        var loadBalancerCatalog = getLoadBalancerCatalog();
        answer.put("components", componentCatalog);
        answer.put("dataformats", dataFormatCatalog);
        answer.put("languages", languageCatalog);
        answer.put("models", modelCatalog);
        answer.put("patterns", patternCatalog);
        answer.put("entities", entityCatalog);
        answer.put("loadbalancers", loadBalancerCatalog);
        return answer;
    }

    /**
     * Get aggregated Camel component Catalog.
     * @return
     * @throws Exception
     */
    public String getComponentCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        api.findComponentNames().stream().sorted().forEach((name) -> {
            try {
                var model = (ComponentModel) api.model(Kind.component, name);
                var json = JsonMapper.asJsonObject(model).toJson();
                var catalogNode = (ObjectNode) jsonMapper.readTree(json);
                generatePropertiesSchema(catalogNode);
                answer.set(name, catalogNode);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    private void generatePropertiesSchema(ObjectNode parent) throws Exception {
        var answer = parent.withObject("/propertiesSchema");
        answer.put("$schema", "http://json-schema.org/draft-07/schema#");
        answer.put("type", "object");

        var properties = parent.withObject("/properties");
        var answerProperties = answer.withObject("/properties");
        var required = new LinkedHashSet<String>();
        for (var propertyEntry : properties.properties()) {
            var propertyName = propertyEntry.getKey();
            var property = (ObjectNode) propertyEntry.getValue();
            var propertySchema = answerProperties.withObject("/" + propertyName);
            if (property.has("displayName")) propertySchema.put("title", property.get("displayName").asText());
            if (property.has("description")) propertySchema.put("description", property.get("description").asText());
            var propertyType = "string";
            if (property.has("type")) {
                propertyType = property.get("type").asText();
                if ("duration".equals(propertyType)) {
                    propertyType = "string";
                    propertySchema.put("$comment", "duration");
                }
                propertySchema.put("type", propertyType);
            }
            if (property.has("deprecated")) propertySchema.put("deprecated", property.get("deprecated").asBoolean());
            if (property.has("required") && property.get("required").asBoolean()) {
                required.add(propertyName);
            }
            if (property.has("defaultValue")) {
                if ("array".equals(propertyType)) {
                    propertySchema.withArray("/default").add(property.get("defaultValue"));
                } else {
                    propertySchema.set("default", property.get("defaultValue"));
                }
            }

            if (property.has("enum")) {
                property.withArray("/enum")
                        .forEach(e -> propertySchema.withArray("/enum").add(e));
                if (!propertySchema.has("type") || "object".equals(propertySchema.get("type").asText())) {
                    propertySchema.put("type", "string");
                }
            } else if ("array".equals(propertyType)) {
                propertySchema.withObject("/items").put("type", "string");
            } else if ("object".equals(propertyType) && property.has("javaType") && !property.get("javaType").asText().startsWith("java.util.Map")) {
                // Put "string" as a type and javaType as a schema $comment to indicate
                // that the UI should handle this as a bean reference field
                propertySchema.put("type", "string");
                propertySchema.put("$comment", "class:" + property.get("javaType").asText());
            }
        }
        required.forEach(req -> answer.withArray("/required").add(req));
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
        var answer = jsonMapper.createObjectNode();
        api.findModelNames().stream().sorted().forEach((name) -> {
            try {
                var model = (EipModel) api.model(Kind.eip, name);
                var json = JsonMapper.asJsonObject(model).toJson();
                var catalogNode = (ObjectNode) jsonMapper.readTree(json);
                if ("from".equals(name)) {
                    // "from" is an exception that is not a processor, therefore it's not in the
                    // pattern catalog - put the propertiesSchema here
                    generatePropertiesSchema(catalogNode);
                }
                answer.set(name, catalogNode);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    /**
     * Get a Camel processor model catalog filtered from model catalog by comparing with YAML DSL schema.
     * @return
     * @throws Exception
     */
    public String getPatternCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var processors = schemaProcessor.getProcessors();
        var catalogMap = new LinkedHashMap<String, EipModel>();
        for (var name : api.findModelNames()) {
            var modelCatalog = (EipModel) api.model(Kind.eip, name);
            catalogMap.put(modelCatalog.getJavaType(), modelCatalog);
        }
        for (var entry : processors.entrySet()) {
            var processorFQCN = entry.getKey();
            var processorSchema = entry.getValue();
            var processorCatalog = catalogMap.get(processorFQCN);
            for (var property : processorSchema.withObject("/properties").properties()) {
                var propertyName = property.getKey();
                var propertySchema = (ObjectNode) property.getValue();
                if (TO_DYNAMIC_DEFINITION.equals(processorFQCN) && "parameters".equals(propertyName)) {
                    // "parameters" as a common property is omitted in the catalog, but we need this for "toD"
                    propertySchema.put("title", "Parameters");
                    propertySchema.put("description", "URI parameters");
                    continue;
                }
                if (SET_HEADERS_DEFINITION.equals((processorFQCN)) && "headers".equals(propertyName)) {
                    propertySchema.put("title", "Headers");
                    propertySchema.put("description", "Headers to set");
                    continue;
                }
                var catalogOpOptional = processorCatalog.getOptions().stream().filter(op -> op.getName().equals(propertyName)).findFirst();
                if (catalogOpOptional.isEmpty()) {
                    throw new Exception(String.format("Option '%s' not found for processor '%s'", propertyName, processorFQCN));
                }
                var catalogOp = catalogOpOptional.get();
                if ("object".equals(catalogOp.getType()) && !catalogOp.getJavaType().startsWith("java.util.Map")
                        && !propertySchema.has("$comment")) {
                    propertySchema.put("$comment", "class:" + catalogOp.getJavaType());
                }
            }
            var json = JsonMapper.asJsonObject(processorCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", processorSchema);
            answer.set(processorCatalog.getName(), catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    /**
     * Get a Camel entity catalog filtered from model catalog, then combine the corresponding part of
     * Camel YAML DSL JSON schema as a `propertiesSchema` in the usable format for uniforms to render
     * the configuration form. "entity" here means the top level properties in Camel YAML DSL, such as
     * "route", "rest", "beans", "routeConfiguration", etc. They are marked with "@YamlIn" annotation
     * in the Camel codebase.
     * This also adds `routeTemplateBean` and `templatedRouteBean` separately. `routeTemplateBean` is
     * also used for Kamelet.
     * @return
     * @throws Exception
     */
    public String getEntityCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var entities = schemaProcessor.getEntities();
        var catalogMap = new LinkedHashMap<String, EipModel>();
        for (var name : api.findModelNames()) {
            var modelCatalog = (EipModel) api.model(Kind.eip, name);
            catalogMap.put(name, modelCatalog);
        }
        InputStream is = api.getClass().getClassLoader().getResourceAsStream("org/apache/camel/catalog/models-app/bean.json");
        var beanJsonObj = JsonMapper.deserialize(new String(is.readAllBytes()));
        var beanModel = JsonMapper.generateEipModel(beanJsonObj);
        catalogMap.put("beans", beanModel);
        for (var entry : entities.entrySet()) {
            var entityName = entry.getKey();
            var entitySchema = entry.getValue();
            var entityCatalog = catalogMap.get(entityName);
            if ("beans".equals(entityName)) {
                processBeansParameters(entitySchema, entityCatalog);
            } else if ("from".equals(entityName)) {
                processFromParameters(entitySchema, entityCatalog);
            } else if ("route".equals(entityName)) {
                processRouteParameters(entitySchema, entityCatalog);
            } else if ("routeTemplate".equals(entityName)) {
                processRouteTemplateParameters(entitySchema, entityCatalog);
            } else if ("templatedRoute".equals(entityName)) {
                processTemplatedRouteParameters(entitySchema, entityCatalog);
            } else if ("restConfiguration".equals(entityName)) {
                processRestConfigurationParameters(entitySchema, entityCatalog);
            } else if ("rest".equals(entityName)) {
                processRestParameters(entitySchema, entityCatalog);
            } else {
                processEntityParameters(entityName, entitySchema, entityCatalog);
            }
            var json = JsonMapper.asJsonObject(entityCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", entitySchema);
            answer.set(entityName, catalogTree);
        }
        addMoreBeans(answer, catalogMap);

        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }

    private void doProcessParameter(EipModel entityCatalog, String propertyName, ObjectNode propertySchema) throws Exception {
        var catalogOp = entityCatalog.getOptions().stream().filter(op -> op.getName().equals(propertyName)).findFirst();
        if (catalogOp.isEmpty()) {
            throw new Exception(String.format("Option '%s' not found for '%s'", propertyName, entityCatalog.getName()));
        }
        var catalogOption = catalogOp.get();
        if (catalogOption.getDisplayName() != null) propertySchema.put("title", catalogOption.getDisplayName());
        if (catalogOption.getDescription() != null) propertySchema.put("description", catalogOption.getDescription());
        var propertyType = propertySchema.has("type") ? propertySchema.get("type").asText() : null;
        if (catalogOption.getDefaultValue() != null) {
            if ("array".equals(propertyType)) {
                propertySchema.withArray("/default").add(catalogOption.getDefaultValue().toString());
            } else {
                propertySchema.put("default", catalogOption.getDefaultValue().toString());
            }
        }
        if (catalogOption.getEnums() != null) {
            catalogOption.getEnums()
                    .forEach(e -> propertySchema.withArray("/enum").add(e));
            if (!propertySchema.has("type") || "object".equals(propertySchema.get("type").asText())) {
                propertySchema.put("type", "string");
            }
        }
    }

    private void processBeansParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        var beanDef = entitySchema.withObject("/definitions").withObject("/org.apache.camel.model.app.RegistryBeanDefinition");
        for (var property : beanDef.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processFromParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("parameters".equals(propertyName)) {
                // "parameters" as a common property is omitted in the catalog, but we need this for "from"
                propertySchema.put("title", "Parameters");
                propertySchema.put("description", "URI parameters");
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processRouteParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var op : entityCatalog.getOptions()) {
            // parameter name mismatch between schema and catalog
            if ("routePolicyRef".equals(op.getName())) {
                op.setName("routePolicy");
            } else if ("streamCache".equals(op.getName())) {
                op.setName("streamCaching");
            }
        }
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("from".equals(propertyName)) {
                // no "from" in the catalog
                propertySchema.put("title", "From");
                propertySchema.put("description", "From");
                continue;
            } else if (List.of("inputType", "outputType").contains(propertyName)) {
                // no "inputType" and "outputType" in the catalog, just keep it as-is
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processRouteTemplateParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var op : entityCatalog.getOptions()) {
            // parameter name mismatch between schema and catalog
            if ("templateBean".equals(op.getName())) {
                op.setName("beans");
            }
        }
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("from".equals(propertyName)) {
                // no "from" in the catalog
                propertySchema.put("title", "From");
                propertySchema.put("description", "From");
                continue;
            } else if ("parameters".equals(propertyName)) {
                // "parameters" as a common property is omitted in the catalog, but we need this for "from"
                propertySchema.put("title", "Parameters");
                propertySchema.put("description", "URI parameters");
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processTemplatedRouteParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var op : entityCatalog.getOptions()) {
            // parameter name mismatch between schema and catalog
            if ("bean".equals(op.getName())) {
                op.setName("beans");
            }
        }
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("from".equals(propertyName)) {
                // no "from" in the catalog
                propertySchema.put("title", "From");
                propertySchema.put("description", "From");
                continue;
            } else if ("parameters".equals(propertyName)) {
                // "parameters" as a common property is omitted in the catalog, but we need this for "from"
                propertySchema.put("title", "Parameters");
                propertySchema.put("description", "URI parameters");
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processRestConfigurationParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("enableCors".equals(propertyName)) {
                // no "from" in the catalog
                propertySchema.put("title", "Enable CORS");
                propertySchema.put("description", "Enable CORS");
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processRestParameters(ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("enableCors".equals(propertyName)) {
                // no "from" in the catalog
                propertySchema.put("title", "Enable CORS");
                propertySchema.put("description", "Enable CORS");
                continue;
            } else if (List.of("get", "post", "put", "patch", "delete", "head").contains(propertyName)) {
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void processEntityParameters(String entityName, ObjectNode entitySchema, EipModel entityCatalog) throws Exception {
        for (var property : entitySchema.withObject("/properties").properties()) {
            var propertyName = property.getKey();
            var propertySchema = (ObjectNode) property.getValue();
            if ("from".equals(entityName) && "parameters".equals(propertyName)) {
                // "parameters" as a common property is omitted in the catalog, but we need this for "from"
                propertySchema.put("title", "Parameters");
                propertySchema.put("description", "URI parameters");
                continue;
            }
            doProcessParameter(entityCatalog, propertyName, propertySchema);
        }
    }

    private void addMoreBeans(ObjectNode answer, Map<String, EipModel> catalogMap) throws Exception {
        var beansCatalog = catalogMap.get("beans");
        var json = JsonMapper.asJsonObject(beansCatalog).toJson();
        var catalogTree = (ObjectNode) jsonMapper.readTree(json);
        var beanDefinition = answer.withObject("/beans")
                .withObject("/propertiesSchema")
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.app.RegistryBeanDefinition");
        catalogTree.set("propertiesSchema", beanDefinition);
        answer.set("bean", catalogTree);

        var routeTemplateBeanCatalog = catalogMap.get("templateBean");
        json = JsonMapper.asJsonObject(routeTemplateBeanCatalog).toJson();
        catalogTree = (ObjectNode) jsonMapper.readTree(json);
        var propertiesSchema = schemaProcessor.getRouteTemplateBean();
        processEntityParameters("routeTemplateBean", propertiesSchema, routeTemplateBeanCatalog);
        catalogTree.set("propertiesSchema", propertiesSchema);
        answer.set("routeTemplateBean", catalogTree);

        var templatedRouteBeanCatalog = catalogMap.get("templatedRouteBean");
        json = JsonMapper.asJsonObject(templatedRouteBeanCatalog).toJson();
        catalogTree = (ObjectNode) jsonMapper.readTree(json);
        propertiesSchema = schemaProcessor.getTemplatedRouteBean();
        processEntityParameters( "templatedRouteBean", propertiesSchema, templatedRouteBeanCatalog);
        catalogTree.set("propertiesSchema", propertiesSchema);
        answer.set("templatedRouteBean", catalogTree);
    }

    /**
     * Get Camel LoadBalancer catalog with a custom loadbalancer added.
     * @return
     * @throws Exception
     */
    public String getLoadBalancerCatalog() throws Exception {
        var answer = jsonMapper.createObjectNode();
        var loadBalancerSchemaMap = schemaProcessor.getLoadBalancers();
        for (var entry : loadBalancerSchemaMap.entrySet()) {
            var loadBalancerName = entry.getKey();
            var loadBalancerSchema = entry.getValue();
            var loadBalancerCatalog = (EipModel) api.model(Kind.eip, loadBalancerName);
            if (loadBalancerCatalog == null) {
                throw new Exception("LoadBalancer " + loadBalancerName + " is not found in Camel model catalog.");
            }
            var json = JsonMapper.asJsonObject(loadBalancerCatalog).toJson();
            var catalogTree = (ObjectNode) jsonMapper.readTree(json);
            catalogTree.set("propertiesSchema", loadBalancerSchema);
            answer.set(loadBalancerName, catalogTree);
        }
        StringWriter writer = new StringWriter();
        var jsonGenerator = new JsonFactory().createGenerator(writer).useDefaultPrettyPrinter();
        jsonMapper.writeTree(jsonGenerator, answer);
        return writer.toString();
    }
}
