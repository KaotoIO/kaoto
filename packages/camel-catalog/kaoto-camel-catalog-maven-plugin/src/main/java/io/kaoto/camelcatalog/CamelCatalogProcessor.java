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

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.Kind;
import org.apache.camel.tooling.model.BaseModel;
import org.apache.camel.tooling.model.BaseOptionModel;
import org.apache.camel.tooling.model.ComponentModel;
import org.apache.camel.tooling.model.DataFormatModel;
import org.apache.camel.tooling.model.EipModel;
import org.apache.camel.tooling.model.JsonMapper;
import org.apache.camel.tooling.model.LanguageModel;
import org.apache.camel.util.json.JsonObject;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Customize Camel Catalog for Kaoto.
 */
public class CamelCatalogProcessor {
    private DefaultCamelCatalog api = new DefaultCamelCatalog();

    /**
     * Create Camel catalogs customized for Kaoto usage.
     * @param yamlDslSchema
     * @return
     */
    public Map<String, String> processCatalog(ObjectNode yamlDslSchema) throws Exception {
        var answer = new LinkedHashMap<String, String>();
        var componentCatalog = getComponentCatalog();
        var dataFormatCatalog = getDataFormatCatalog();
        var languageCatalog = getLanguageCatalog();
        var modelCatalog = getModelCatalog();
        var patternCatalog = getPatternCatalog(yamlDslSchema);
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
        var answer = new LinkedHashMap<String, JsonObject>();
        api.findDataFormatNames().stream().sorted().forEach((name) -> {
            try {
                var model = (DataFormatModel) api.model(Kind.dataformat, name);
                answer.put(name, JsonMapper.asJsonObject(model));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        EipModel customDataFormatModel = (EipModel) api.model(Kind.eip, "custom");
        DataFormatModel customDataFormat = new DataFormatModel();
        copyBaseModel(customDataFormatModel, customDataFormat);
        customDataFormat.setModelJavaType(customDataFormatModel.getJavaType());
        customDataFormat.setModelName(customDataFormatModel.getName());
        customDataFormatModel.getOptions().forEach((option) -> {
            var customOption = new DataFormatModel.DataFormatOptionModel();
            copyBaseOption(option, customOption);
            customDataFormat.addOption(customOption);
        });
        answer.put("custom", JsonMapper.asJsonObject(customDataFormat));

        return JsonMapper.serialize(answer);
    }

    private void copyBaseModel(BaseModel from, BaseModel to) {
        to.setDeprecatedSince(from.getDeprecatedSince());
        to.setDeprecationNote(from.getDeprecationNote());
        to.setDeprecated(from.isDeprecated());
        to.setDescription(from.getDescription());
        to.setFirstVersion(from.getFirstVersion());
        to.setLabel(from.getLabel());
        to.setName(from.getName());
        to.setSupportLevel(from.getSupportLevel());
        to.setTitle(from.getTitle());
    }

    private void copyBaseOption(BaseOptionModel from, BaseOptionModel to) {
        to.setAsPredicate(from.isAsPredicate());
        to.setAutowired(from.isAutowired());
        to.setConfigurationClass(from.getConfigurationClass());
        to.setConfigurationField(from.getConfigurationField());
        to.setDefaultValue(from.getDefaultValue());
        to.setDefaultValueNote(from.getDefaultValueNote());
        to.setDeprecated(from.isDeprecated());
        to.setDeprecationNote(from.getDeprecationNote());
        to.setDescription(from.getDescription());
        to.setDisplayName(from.getDisplayName());
        to.setEnums(from.getEnums());
        to.setGetterMethod(from.getGetterMethod());
        to.setGroup(from.getGroup());
        to.setIndex(from.getIndex());
        to.setJavaType(from.getJavaType());
        to.setKind(from.getKind());
        to.setLabel(from.getLabel());
        to.setMultiValue(from.isMultiValue());
        to.setName(from.getName());
        to.setNestedType(from.getNestedType());
        to.setNewGroup(from.isNewGroup());
        to.setOneOfs(from.getOneOfs());
        to.setOptionalPrefix(from.getOptionalPrefix());
        to.setPrefix(from.getPrefix());
        to.setRequired(from.isRequired());
        to.setSecret(from.isSecret());
        to.setSetterMethod(from.getSetterMethod());
        to.setSupportFileReference(from.isSupportFileReference());
        to.setType(from.getType());
    }

    /**
     * Get Camel language catalog with a custom language added.
     * @return
     * @throws Exception
     */
    public String getLanguageCatalog() throws Exception {
        var answer = new LinkedHashMap<String, JsonObject>();
        api.findLanguageNames().stream().sorted().forEach((name) -> {
            try {
                if ("file".equals(name)) {
                    // "file" language is merged with "simple" language and it doesn't exist in YAML DSL schema. Remove it here.
                    return;
                }
                var model = (LanguageModel) api.model(Kind.language, name);
                answer.put(name, JsonMapper.asJsonObject(model));
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
        EipModel customLanguageModel = (EipModel) api.model(Kind.eip, "language");
        LanguageModel customLanguage = new LanguageModel();
        copyBaseModel(customLanguageModel, customLanguage);
        customLanguage.setModelJavaType(customLanguageModel.getJavaType());
        customLanguage.setModelName(customLanguageModel.getName());
        customLanguageModel.getOptions().forEach((option) -> {
            var customOption = new LanguageModel.LanguageOptionModel();
            copyBaseOption(option, customOption);
            customLanguage.addOption(customOption);
        });
        answer.put("language", JsonMapper.asJsonObject(customLanguage));

        return JsonMapper.serialize(answer);
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
    public String getPatternCatalog(ObjectNode camelYamlDslSchema) throws Exception {
        var answer = new LinkedHashMap<String, JsonObject>();
        var processors = camelYamlDslSchema
                .withObject("/items")
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.ProcessorDefinition")
                .withObject("/properties");
        api.findModelNames().stream().sorted().forEach((name) -> {
            var model = (EipModel) api.model(Kind.eip, name);
            if (!processors.has(name)) {
                return;
            }
            var processorSchema = processors.withObject("/" + name);
            var javaType = processorSchema.get("$ref").asText().substring(20);
            if (javaType.equals(model.getJavaType())) {
                answer.put(name, JsonMapper.asJsonObject(model));
            }
        });
        return JsonMapper.serialize(answer);
    }


}
