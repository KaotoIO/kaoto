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

import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.plugins.annotations.ResolutionScope;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;

/**
 * Collects the camel metadata files such as catalog and schema and
 * tailors them to fit with Kaoto needs.
 * This plugin expects the following directory structure under inputDirectory:
 * <ul>
 * <li>catalog/ - The root directory of extracted camel-catalog</li>
 * <li>crds/ - Holds Camel K CRD YAML files</li>
 * <li>kamelets/ - Holds Kamelet definition YAML files</li>
 * <li>schema/ - Holds Camel YAML DSL JSON schema files</li>
 * </ul>
 * In addition to what is generated from above input files, this plugin
 * generates index.json file that holds the list of all the generated.
 */
@Mojo(
        name = "generate-kaoto-camel-catalog",
        defaultPhase = LifecyclePhase.GENERATE_SOURCES,
        requiresDependencyResolution = ResolutionScope.COMPILE,
        threadSafe = true,
        requiresProject = false)
public class KaotoCamelCatalogMojo extends AbstractMojo {

    private static final String SCHEMA = "schema";
    public static final String CAMEL_YAML_DSL = "camelYamlDsl";
    private static final String K8S_V1_OPENAPI = "kubernetes-api-v1-openapi";
    private static final String CAMEL_CATALOG_AGGREGATE = "camel-catalog-aggregate";
    private static final String CRDS = "crds";
    private static final String CRD_SCHEMA = "crd-schema";
    private static final String KAMELET = "kamelet";
    private static final String KAMELETS = "kamelets";
    private static final String KAMELETS_AGGREGATE = "kamelets-aggregate";

    private static final ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    private static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    @Parameter(required = true)
    private File inputDirectory;

    @Parameter(required = true)
    private File outputDirectory;

    @Parameter(required = true)
    private String camelVersion;

    @Parameter(required = true)
    private String camelKCRDVersion;

    @Parameter(required = true)
    private String kameletsVersion;

    @Parameter
    private List<String> kubernetesDefinitions;

    @Parameter
    private List<String> additionalSchemas;

    public void execute() {
        if (!inputDirectory.exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "inputDirectory '%s' does not exist", inputDirectory.getName())));
            return;
        }
        outputDirectory.mkdirs();
        var path = inputDirectory.toPath();
        var index = new Index();
        var yamlDslSchemaProcessor = processCamelSchema(path, index);
        processK8sSchema(path, index);
        processCatalog(yamlDslSchemaProcessor, index);
        processCRDs(path, index);
        processKamelets(path, index);
        processAdditionalSchemas(path, index);
        try {
            var indexFile = outputDirectory.toPath().resolve("index.json").toFile();
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(indexFile, index);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private CamelYamlDslSchemaProcessor processCamelSchema(Path inputDir, Index index) {
        var schema = inputDir.resolve(SCHEMA).resolve(CAMEL_YAML_DSL + ".json");
        if (!schema.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Camel YAML DSL JSON Schema file not found: %s",
                    schema
            )));
            return null;
        }
        var outputFileName = CAMEL_YAML_DSL + ".json";
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            output.getParent().toFile().mkdirs();
            Files.copy(schema, output, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            getLog().error(e);
            return null;
        }
        var indexEntry = new Entry(
                "camelYamlDsl",
                "Camel YAML DSL JSON schema",
                camelVersion,
                outputFileName);
        index.getSchemas().put("camelYamlDsl", indexEntry);

        try {
            var yamlDslSchema = (ObjectNode) jsonMapper.readTree(schema.toFile());
            var schemaProcessor = new CamelYamlDslSchemaProcessor(jsonMapper, yamlDslSchema);
            var schemaMap = schemaProcessor.processSubSchema();
            schemaMap.forEach((name, subSchema) -> {
                var subSchemaFileName = String.format("%s-%s.json", KaotoCamelCatalogMojo.CAMEL_YAML_DSL, name);
                var subSchemaPath = outputDirectory.toPath().resolve(subSchemaFileName);
                try {
                    subSchemaPath.getParent().toFile().mkdirs();
                    Files.writeString(subSchemaPath, subSchema);
                    var subSchemaIndexEntry = new Entry(
                            name,
                            "Camel YAML DSL JSON schema: " + name,
                            camelVersion,
                            subSchemaFileName);
                    index.getSchemas().put(name, subSchemaIndexEntry);
                } catch (Exception e) {
                    getLog().error(e);
                }
            });
            return schemaProcessor;
        } catch (Exception e) {
            getLog().error(e);
            return null;
        }
    }

    private void processK8sSchema(Path inputDir, Index index) {
        var openapiSpecPath = inputDir.resolve(SCHEMA).resolve(K8S_V1_OPENAPI + ".json");
        if (!openapiSpecPath.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Kubernetes OpenAPI JSON Schema file not found: %s",
                    openapiSpecPath
            )));
            return;
        }

        try {
            var openapiSpec = (ObjectNode) jsonMapper.readTree(openapiSpecPath.toFile());
            var processor = new K8sSchemaProcessor(jsonMapper, openapiSpec);
            var schemaMap = processor.processK8sDefinitions(kubernetesDefinitions);
            for (var entry : schemaMap.entrySet()) {
                var name = entry.getKey();
                var schema = entry.getValue();
                var outputFileName = String.format("%s-%s.json", K8S_V1_OPENAPI, name);
                var output = outputDirectory.toPath().resolve(outputFileName);
                Files.writeString(output, schema);
                var indexEntry = new Entry(
                        name,
                        "Kubernetes OpenAPI JSON schema: " + name,
                        "v1",
                        outputFileName);
                index.getSchemas().put(name, indexEntry);
            }
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processCatalog(CamelYamlDslSchemaProcessor schemaProcessor, Index index) {
        var catalogProcessor = new CamelCatalogProcessor(jsonMapper, schemaProcessor);
        try {
            var catalogMap = catalogProcessor.processCatalog();
            catalogMap.forEach((name, catalog) -> {
                var outputFileName = String.format(
                        "%s-%s.json", CAMEL_CATALOG_AGGREGATE, name);
                var output = outputDirectory.toPath().resolve(outputFileName);
                try {
                    Files.writeString(output, catalog);
                    var indexEntry = new Entry(
                            name,
                            "Aggregated Camel catalog for " + name,
                            camelVersion,
                            outputFileName);
                    index.getCatalogs().put(name, indexEntry);
                } catch (Exception e) {
                    getLog().error(e);
                }
            });
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processCRDs(Path inputDir, Index index) {
        var crdDir = inputDir.resolve(CRDS);
        if (!crdDir.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Camel K CRD directory is not valid: %s",
                    crdDir)));
            return;
        }
        try {
            Files.list(crdDir)
                    .sorted()
                    .forEach(f -> processCRDFile(f, index));
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processCRDFile(Path file, Index index) {
        var dotSplitted = file.getFileName().toString().split("\\.");
        if (dotSplitted.length < 4
                || !"camel".equalsIgnoreCase(dotSplitted[0])
                || !"apache".equalsIgnoreCase(dotSplitted[1])
                || !"yaml".equalsIgnoreCase(dotSplitted[3])) {
            getLog().error(new Exception(
                    "Invalid Camel K CRD file name, it is expected to be"
                            + "'camel.apache.org_<CRD name>.yaml', but it was: "
                            + file.getFileName()));
            return;
        }
        var underscoreSplitted = dotSplitted[2].split("_");
        if (underscoreSplitted.length < 2 || !"org".equals(underscoreSplitted[0])) {
            getLog().error(new Exception(
                    "Invalid Camel K CRD file name, it is expected to be"
                            + "'camel.apache.org_<CRD name>.yaml', but it was: "
                            + file.getFileName()));
            return;
        }
        var outputFileName = String.format(
                "%s-%s.json", CRD_SCHEMA, underscoreSplitted[1]);
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            var crd = yamlMapper.readValue(file.toFile(), CustomResourceDefinition.class);
            var schema = crd.getSpec().getVersions().get(0).getSchema().getOpenAPIV3Schema();
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), schema);
            var name = crd.getSpec().getNames().getKind();
            var description = name;
            var indexEntry = new Entry(
                    name,
                    description,
                    camelKCRDVersion,
                    outputFileName);
            index.getSchemas().put(name, indexEntry);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processKamelets(Path inputDir, Index index) {
        var kameletsDir = inputDir.resolve(KAMELETS);
        if (!kameletsDir.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Kamelets directory is not valid: %s",
                    kameletsDir)));
            return;
        }
        var root = jsonMapper.createObjectNode();
        try {
            Files.list(kameletsDir).sorted().forEach(f -> {
                        if (f.toFile().isDirectory()) {
                            processKameletCategory(f, index);
                        } else {
                            processKameletFile(f, root);
                        }
                    }
            );
            var outputFileName = KAMELETS_AGGREGATE + ".json";
            var output = outputDirectory.toPath().resolve(outputFileName);
            JsonFactory jsonFactory = new JsonFactory();
            var writer = new FileWriter(output.toFile());
            var jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(jsonGenerator, root);
            var indexEntry = new Entry(
                    KAMELETS,
                    "Aggregated Kamelet definitions in JSON",
                    kameletsVersion,
                    outputFileName);
            index.getCatalogs().put(KAMELETS, indexEntry);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processKameletCategory(Path dir, Index index) {
        var categoryName = dir.getFileName();
        try {
            if (Files.list(dir).count() == 0) {
                return;
            }
            var category = jsonMapper.createObjectNode();
            Files.list(dir).sorted().forEach(f -> processKameletFile(f, category));
            var outputFileName = String.format("%s-%s.json", KAMELET, categoryName);
            var output = outputDirectory.toPath().resolve(outputFileName);
            JsonFactory jsonFactory = new JsonFactory();
            var writer = new FileWriter(output.toFile());
            var jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(jsonGenerator, category);
            var capitalizedCategoryName = categoryName.toString().substring(0, 1).toUpperCase()
                    + categoryName.toString().substring(1);
            var indexEntryName = String.format("%s%s", KAMELET, capitalizedCategoryName);
            var indexEntry = new Entry(
                    indexEntryName,
                    String.format("Kamelet definitions of category '%s' in JSON", categoryName),
                    kameletsVersion,
                    outputFileName);
            index.getCatalogs().put(indexEntryName, indexEntry);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processKameletFile(Path kamelet, ObjectNode targetObject) {
        var splitted = kamelet.getFileName().toString().split("\\.");
        if (splitted.length < 2) {
            getLog().error(new Exception("Invalid file name: " + kamelet.getFileName()));
            return;
        }
        try {
            String lowerFileName = kamelet.getFileName().toString().toLowerCase();
            JsonNode kameletNode;
            if (lowerFileName.endsWith(".yaml") || lowerFileName.endsWith(".yml")) {
                kameletNode = yamlMapper.readTree(kamelet.toFile());
            } else if (lowerFileName.endsWith(".json")) {
                // Try JSON as a fallback
                kameletNode = jsonMapper.readTree(kamelet.toFile());
            } else {
                return;
            }
            targetObject.putIfAbsent(splitted[0], kameletNode);
        } catch (Exception e) {
            getLog().error(e);
        }

    }

    private void processAdditionalSchemas(Path inputDir, Index index) {
        if (additionalSchemas == null) {
            return;
        }
        for (String schema : additionalSchemas) {
            try {
                var input = Paths.get(schema);
                var name = input.getFileName().toString().split("\\.")[0];
                var output = outputDirectory.toPath().resolve(input.getFileName());
                Files.copy(input, output, StandardCopyOption.REPLACE_EXISTING);
                var indexEntry = new Entry(
                        name,
                        "Camel K Pipe ErrorHandler JSON schema",
                        "1",
                        output.getFileName().toString());
                index.getSchemas().put(name, indexEntry);
            } catch (Exception e) {
                getLog().error(e);
            }
        }
    }
}
