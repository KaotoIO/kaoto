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
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.kaoto.camelcatalog.CamelYamlDslSchemaProcessor;
import org.apache.camel.dsl.yaml.CamelYamlRoutesBuilderLoader;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CamelYamlDslSchemaProcessorTest {
    private final ObjectMapper jsonMapper;
    private final ObjectNode yamlDslSchema;
    private final CamelYamlDslSchemaProcessor processor;

    public CamelYamlDslSchemaProcessorTest() throws Exception {
        jsonMapper = new ObjectMapper();
        var is = CamelYamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json");
        yamlDslSchema = (ObjectNode) jsonMapper.readTree(is);
        processor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
    }

    @Test
    public void testProcessSubSchema() throws Exception {
        var subSchemaMap = processor.processSubSchema();
        assertTrue(subSchemaMap.size() > 10 && subSchemaMap.size() < 20);
        var beansSchema = jsonMapper.readTree(subSchemaMap.get("beans"));
        assertEquals("array", beansSchema.get("type").asText());
        var beanSchema = beansSchema
                .withObject("/definitions")
                .withObject("/org.apache.camel.model.app.RegistryBeanDefinition");
        var beanPropertySchema = beanSchema
                .withObject("/properties")
                .withObject("/properties");
        assertEquals("object", beanPropertySchema.get("type").asText());
    }

    @Test
    public void testGetDataFormats() throws Exception {
        var dataFormatMap = processor.getDataFormats();
        assertTrue(dataFormatMap.size() > 30 && dataFormatMap.size() < 50);
        var customDataFormat = dataFormatMap.get("custom");
        assertEquals("Custom", customDataFormat.get("title").asText());
        var refProperty = customDataFormat.withObject("/properties").withObject("/ref");
        assertEquals("Ref", refProperty.get("title").asText());
        var jsonDataFormat = dataFormatMap.get("json");
        assertEquals("JSon", jsonDataFormat.get("title").asText());
        var libraryEnum = jsonDataFormat.withObject("/properties").withObject("/library").withArray("enum");
        assertTrue(libraryEnum.size() > 4);
    }

    @Test
    public void testGetDataFormatYaml() throws Exception {
        var dataFormatMap = processor.getDataFormats();
        var yamlDataFormat = dataFormatMap.get("yaml");
        var typeFilterDefinition = yamlDataFormat.withObject("/definitions").withObject("org.apache.camel.model.dataformat.YAMLTypeFilterDefinition");
        assertEquals("object", typeFilterDefinition.get("type").asText());
        var propType = typeFilterDefinition.withObject("/properties").withObject("/type");
        assertEquals("string", propType.get("type").asText());
        assertEquals("Type", propType.get("title").asText());
    }

    @Test
    public void testGetLanguages() throws Exception {
        var languageMap = processor.getLanguages();
        assertTrue(languageMap.size() > 20 && languageMap.size() < 30);
        var customLanguage = languageMap.get("language");
        assertEquals("Language", customLanguage.get("title").asText());
        var languageProperty = customLanguage.withObject("/properties").withObject("/language");
        assertEquals("Language", languageProperty.get("title").asText());
        var jqLanguage = languageMap.get("jq");
        assertEquals("JQ", jqLanguage.get("title").asText());
        var expressionProperty = jqLanguage.withObject("/properties").withObject("/expression");
        assertEquals("Expression", expressionProperty.get("title").asText());
    }
}
