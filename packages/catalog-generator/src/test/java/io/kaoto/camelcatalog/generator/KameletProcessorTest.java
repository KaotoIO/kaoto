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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.junit.jupiter.api.Test;

import java.net.JarURLConnection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class KameletProcessorTest {
    private static final List<String> ALLOWED_ENUM_TYPES = List.of("integer", "number", "string");
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());;

    private ObjectNode processKamelet(String name) throws Exception {
        var is = Thread.currentThread().getContextClassLoader().getResourceAsStream("kamelets/" + name + ".kamelet.yaml");
        var kamelet = (ObjectNode) yamlMapper.readTree(is);
        KameletProcessor.process(kamelet);
        return kamelet;
    }

    private Map<String, ObjectNode> getAllKameletFiles() throws Exception {
        var answer = new HashMap<String, ObjectNode>();
        var url = Thread.currentThread().getContextClassLoader().getResource("kamelets");
        var conn = (JarURLConnection) url.openConnection();
        var jar = conn.getJarFile();
        var entries = jar.entries();
        while (entries.hasMoreElements()) {
            var entry = entries.nextElement();
            if (entry.getName().startsWith("kamelets/") && entry.getName().endsWith(".kamelet.yaml")) {
                var is = jar.getInputStream(entry);
                var kamelet = (ObjectNode) yamlMapper.readTree(is);
                KameletProcessor.process(kamelet);
                answer.put(entry.getName(), kamelet);
            }
        }
        return answer;
    }

    @Test
    void test() throws Exception {
        var beerSource = processKamelet("beer-source");
        assertTrue(beerSource.has("propertiesSchema"));
        var periodProp = beerSource.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/period");
        assertEquals("integer", periodProp.get("type").asText());
        assertEquals(5000, periodProp.get("default").asInt());
        var googleStorageSink = processKamelet("google-storage-sink");
        var serviceAccountKeyProp = googleStorageSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/serviceAccountKey");
        assertEquals("string", serviceAccountKeyProp.get("type").asText());
        assertEquals("Service Account Key", serviceAccountKeyProp.get("title").asText());
        var awsCloudwatchSink = processKamelet("aws-cloudwatch-sink");
        var accessKeyProp = awsCloudwatchSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/accessKey");
        assertEquals("string", accessKeyProp.get("type").asText());
        assertEquals("password", accessKeyProp.get("format").asText());
        var regionProp = awsCloudwatchSink.withObject("/propertiesSchema")
                .withObject("/properties")
                .withObject("/region");
        assertEquals("string", regionProp.get("type").asText());
        var regionEnum = regionProp.withArray("/enum");
        for (Iterator<JsonNode> it = regionEnum.elements(); it.hasNext(); ) {
            var region = it.next();
            if ("us-west-1".equals(region.asText())) return;
        }
        fail("us-west-1 not found in region enum");
    }

    @Test
    void testEnumParameters() throws Exception {
        for (var kamelet : getAllKameletFiles().values()) {
            var schema = kamelet.withObject("/propertiesSchema");
            var title = schema.get("title");
            if (!schema.has("properties")) continue;
            var properties = schema.withObject("/properties");
            for (var property : properties.properties()) {
                var name = property.getKey();
                var prop = property.getValue();
                if (prop.has("enum")) {
                    assertTrue(ALLOWED_ENUM_TYPES.contains(prop.get("type").asText()), title + ":" + name);
                }
            }
        }
    }
}
