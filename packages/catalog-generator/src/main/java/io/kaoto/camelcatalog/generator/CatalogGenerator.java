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

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.kaoto.camelcatalog.generators.CRDGenerator;
import io.kaoto.camelcatalog.maven.CamelCatalogVersionLoader;
import io.kaoto.camelcatalog.model.CatalogDefinition;
import io.kaoto.camelcatalog.model.CatalogDefinitionEntry;

import java.io.*;
import java.nio.file.Files;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import static io.kaoto.camelcatalog.model.Constants.*;

public class CatalogGenerator {
    private static final Logger LOGGER = Logger.getLogger(CatalogGenerator.class.getName());

    private static final ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    private static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    private final CatalogGeneratorBuilder catalogGeneratorBuilder;
    private final CamelCatalogVersionLoader camelCatalogVersionLoader;
    private final File outputDirectory;
    private String camelCatalogVersion;
    private String kameletsVersion;
    private String camelKCRDsVersion;

    CatalogGenerator(CatalogGeneratorBuilder catalogGeneratorBuilder, CamelCatalogVersionLoader camelCatalogVersionLoader,
                     File outputDirectory) {
        this.catalogGeneratorBuilder = catalogGeneratorBuilder;
        this.camelCatalogVersionLoader = camelCatalogVersionLoader;
        this.outputDirectory = outputDirectory;
    }

    public CatalogDefinition generate() {
        camelCatalogVersionLoader.loadKameletBoundaries();
        camelCatalogVersionLoader.loadCamelCatalog(camelCatalogVersion);
        camelCatalogVersionLoader.loadKamelets(kameletsVersion);
        camelCatalogVersionLoader.loadKubernetesSchema();
        camelCatalogVersionLoader.loadCamelKCRDs(camelKCRDsVersion);
        camelCatalogVersionLoader.loadLocalSchemas();
        camelCatalogVersionLoader.loadKaotoPatterns();
        camelCatalogVersionLoader.loadCamelYamlDsl(camelCatalogVersion);

        var catalogDefinition = new CatalogDefinition();
        var yamlDslSchemaProcessor = processCamelSchema(catalogDefinition);
        processCatalog(yamlDslSchemaProcessor, catalogDefinition);
        processKameletBoundaries(catalogDefinition);
        processKamelets(catalogDefinition);
        processKameletsCRDs(catalogDefinition);

        try {
            String filename = String.format("%s-%s.json", "index",
                    Util.generateHash(catalogDefinition.toString()));

            File indexFile = outputDirectory.toPath().resolve(filename).toFile();
            catalogDefinition
                    .setName("Camel " + camelCatalogVersionLoader.getRuntime().getLabel() + " " + camelCatalogVersion);
            catalogDefinition.setVersion(camelCatalogVersion);
            catalogDefinition.setRuntime(camelCatalogVersionLoader.getRuntime());
            catalogDefinition.setFileName(indexFile.getName());

            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(indexFile, catalogDefinition);

            return catalogDefinition;
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
        }

        return null;
    }

    public String getKameletsVersion() {
        return kameletsVersion;
    }

    public void setKameletsVersion(String kameletsVersion) {
        this.kameletsVersion = kameletsVersion;
    }

    public String getCamelCatalogVersion() {
        return camelCatalogVersion;
    }

    public void setCamelCatalogVersion(String camelCatalogVersion) {
        this.camelCatalogVersion = camelCatalogVersion;
    }

    public String getCamelKCRDsVersion() {
        return camelKCRDsVersion;
    }

    public void setCamelKCRDsVersion(String camelKCRDsVersion) {
        this.camelKCRDsVersion = camelKCRDsVersion;
    }

    private CamelYamlDslSchemaProcessor processCamelSchema(CatalogDefinition index) {
        if (camelCatalogVersionLoader.getCamelYamlDslSchema() == null) {
            LOGGER.severe("Camel YAML DSL JSON Schema is not loaded");
            return null;
        }

        var camelYamlDSLSchema07 = camelCatalogVersionLoader.getCamelYamlDslSchema().replace(
                "http://json-schema.org/draft-04/schema#", "http://json-schema.org/draft-07/schema#");
        try {
            var outputFileName = String.format("%s-%s.json", CAMEL_YAML_DSL_FILE_NAME,
                    Util.generateHash(camelYamlDSLSchema07));
            var output = outputDirectory.toPath().resolve(outputFileName);
            output.getParent().toFile().mkdirs();

            Files.writeString(output, camelYamlDSLSchema07);

            var indexEntry = new CatalogDefinitionEntry(
                    CAMEL_YAML_DSL_FILE_NAME,
                    "Camel YAML DSL JSON schema",
                    camelCatalogVersion,
                    outputFileName);
            index.getSchemas().put(CAMEL_YAML_DSL_FILE_NAME, indexEntry);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
            return null;
        }

        try {
            var yamlDslSchema = (ObjectNode) jsonMapper.readTree(camelYamlDSLSchema07);

            return new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
            return null;
        }
    }

    private void processCatalog(CamelYamlDslSchemaProcessor schemaProcessor, CatalogDefinition index) {
        var catalogProcessor = new CamelCatalogProcessor(camelCatalogVersionLoader.getCamelCatalog(), jsonMapper,
                schemaProcessor, catalogGeneratorBuilder.getRuntime(),
                catalogGeneratorBuilder.isVerbose(), camelCatalogVersionLoader);
        try {
            var catalogMap = catalogProcessor.processCatalog();
            catalogMap.forEach((name, catalog) -> {
                try {
                    var outputFileName = String.format(
                            "%s-%s-%s.json", CAMEL_CATALOG_AGGREGATE, name, Util.generateHash(catalog));
                    var output = outputDirectory.toPath().resolve(outputFileName);
                    Files.writeString(output, catalog);
                    var indexEntry = new CatalogDefinitionEntry(
                            name,
                            "Aggregated Camel catalog for " + name,
                            camelCatalogVersion,
                            outputFileName);
                    index.getCatalogs().put(name, indexEntry);
                } catch (Exception e) {
                    LOGGER.log(Level.SEVERE, e.toString(), e);
                }
            });
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
        }
    }

    private void processKameletBoundaries(CatalogDefinition index) {
        if (camelCatalogVersionLoader.getKameletBoundaries().isEmpty()) {
            LOGGER.severe("Kamelet boundaries are not loaded");
            return;
        }

        var indexEntry = getKameletsEntry(camelCatalogVersionLoader.getKameletBoundaries(), KAMELET_BOUNDARIES_KEY,
                KAMELET_BOUNDARIES_FILENAME, "Aggregated Kamelet boundaries in JSON");
        index.getCatalogs().put(indexEntry.name(), indexEntry);
    }

    private void processKamelets(CatalogDefinition index) {
        if (camelCatalogVersionLoader.getKamelets().isEmpty()) {
            LOGGER.severe("Kamelets are not loaded");
        }

        var indexEntry = getKameletsEntry(camelCatalogVersionLoader.getKamelets(), KAMELETS, KAMELETS_AGGREGATE,
                "Aggregated Kamelets in JSON");
        index.getCatalogs().put(indexEntry.name(), indexEntry);
    }

    private CatalogDefinitionEntry getKameletsEntry(List<String> kamelets, String name, String filename,
                                                    String description) {
        var root = jsonMapper.createObjectNode();

        try {
            sortKamelets(kamelets).forEach(kamelet -> {
                processKameletFile(kamelet, root);
            });

            JsonFactory jsonFactory = new JsonFactory();
            var outputStream = new ByteArrayOutputStream();
            var writer = new OutputStreamWriter(outputStream);

            try (JsonGenerator jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter()) {
                jsonMapper.writeTree(jsonGenerator, root);
                var rootBytes = outputStream.toByteArray();
                var outputFileName = String.format("%s-%s.json", filename, Util.generateHash(rootBytes));
                var output = outputDirectory.toPath().resolve(outputFileName);

                Files.write(output, rootBytes);

                return new CatalogDefinitionEntry(
                        name,
                        description,
                        kameletsVersion,
                        outputFileName);
            } catch (IOException e) {
                LOGGER.log(Level.SEVERE, e.toString(), e);
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
        }

        return null;
    }

    private void processKameletFile(String kamelet, ObjectNode targetObject) {
        try {
            JsonNode kameletNode = yamlMapper.readTree(kamelet);
            String lowerFileName = kameletNode.get("metadata").get("name").asText().toLowerCase();

            KameletProcessor.process((ObjectNode) kameletNode);
            targetObject.putIfAbsent(lowerFileName, kameletNode);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
        }
    }

    private List<String> sortKamelets(List<String> kamelets) {
        return kamelets.stream().sorted(
            (k1, k2) -> {
                try {
                    JsonNode kameletNode1 = yamlMapper.readTree(k1);
                    JsonNode kameletNode2 = yamlMapper.readTree(k2);
                    String kamelet1 = kameletNode1.get("metadata").get("name").asText().toLowerCase();
                    String kamelet2 = kameletNode2.get("metadata").get("name").asText().toLowerCase();
                    return kamelet1.compareTo(kamelet2);
                } catch (Exception e) {
                    LOGGER.log(Level.SEVERE, e.toString(), e);
                }
                return 0;
            }).toList();
    }

    private void processKameletsCRDs(CatalogDefinition index) {
        if (camelCatalogVersionLoader.getCamelKCRDs().isEmpty()) {
            LOGGER.severe("CamelK CRDs are not loaded");
            return;
        }

        CRDGenerator crdGenerator = new CRDGenerator(camelCatalogVersionLoader.getCamelKCRDs());
        var crdMap = crdGenerator.generate();
        crdMap.forEach((name, catalog) -> {
            try {
                var outputFileName = String.format(
                        "%s-%s-%s.json", CRD_SCHEMA, name.toLowerCase(), Util.generateHash(catalog));
                var output = outputDirectory.toPath().resolve(outputFileName);
                Files.writeString(output, catalog);
                var indexEntry = new CatalogDefinitionEntry(
                        name,
                        name,
                        camelKCRDsVersion,
                        outputFileName);
                index.getSchemas().put(name, indexEntry);
            } catch (Exception e) {
                LOGGER.log(Level.SEVERE, e.toString(), e);
            }
        });
    }
}
