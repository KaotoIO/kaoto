/*
 * Copyright (C) 2017 Red Hat, Inc.
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
import java.nio.file.StandardCopyOption;
import java.util.List;

import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
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
 * This plugin expects the following directory structore under inputDirectory:
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
        inheritByDefault = false,
        defaultPhase = LifecyclePhase.GENERATE_SOURCES,
        requiresDependencyResolution = ResolutionScope.COMPILE,
        threadSafe = true,
        requiresProject = false)
public class KaotoCamelCatalogMojo extends AbstractMojo {

    private static final String SCHEMA = "schema";
    private static final String CAMEL_YAML_DSL = "camel-yaml-dsl";
    private static final String CAMEL_CATALOG_AGGREGATE = "camel-catalog-aggregate";
    private static final String CRDS = "crds";
    private static final String CRD_SCHEMA = "crd-schema";
    private static final String KAMELETS = "kamelets";
    private static final String KAMELETS_AGGREGATE = "kamelets-aggregate";

    private static final ObjectMapper jsonMapper = new ObjectMapper();
    private static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    @Parameter(required = true)
    private File inputDirectory;

    @Parameter(required = true)
    private File outputDirectory;

    @Parameter
    private List<String> catalogCategoryExclusions;

    @Parameter(required = true)
    private String camelVersion;

    @Parameter(required = true)
    private String camelKCRDVersion;

    @Parameter(required = true)
    private String kameletsVersion;

    public void execute() throws MojoExecutionException, MojoFailureException {
        if (!inputDirectory.exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "inputDirectory '%s' does not exist", inputDirectory.getName())));
            return;
        }
        outputDirectory.mkdirs();
        var path = inputDirectory.toPath();
        var index = new Index();
        processSchema(path, index);
        processCatalog(path, index);
        processCRDs(path, index);
        processKamelets(path, index);
        try {
            var indexFile = outputDirectory.toPath().resolve("index.json").toFile();
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(indexFile, index);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processSchema(Path inputDir, Index index) {
        var schema = inputDir.resolve(SCHEMA).resolve(CAMEL_YAML_DSL + ".json");
        if (!schema.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Camel YAML DSL JSON Schema file not found: %s",
                    schema
            )));
            return;
        }
        var outputFileName = String.format("%s-%s.json", CAMEL_YAML_DSL, camelVersion);
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            output.getParent().toFile().mkdirs();
            Files.copy(schema, output, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            getLog().error(e);
            return;
        }
        var indexEntry = new Entry("Camel YAML DSL JSON schema", camelVersion, outputFileName);
        index.getSchemas().add(indexEntry);
    }

    private void processCatalog(Path inputDir, Index index) {
        var catalogRoot = inputDir
                .resolve("catalog")
                .resolve("org")
                .resolve("apache")
                .resolve("camel")
                .resolve("catalog");
        try {
            Files.list(catalogRoot)
                    .filter(f -> isSupportredCatalogCategory(f))
                    .sorted()
                    .forEach(f -> processCatalogCategory(f, index));
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private boolean isSupportredCatalogCategory(Path category) {
        return category.toFile().isDirectory()
                && !catalogCategoryExclusions.contains(category.getFileName().toString());
    }

    private void processCatalogCategory(Path category, Index index) {
        var targetObject = jsonMapper.createObjectNode();
        try {
            Files.list(category)
                    .sorted()
                    .forEach(f -> processCatalogFile(f, targetObject));
            var categoryName = category.getFileName().toString();
            var outputFileName = String.format(
                    "%s-%s-%s.json", CAMEL_CATALOG_AGGREGATE, categoryName, camelVersion);
            var output = outputDirectory.toPath().resolve(outputFileName);
            JsonFactory jsonFactory = new JsonFactory();
            var writer = new FileWriter(output.toFile());
            var jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(jsonGenerator, targetObject);
            var indexEntry = new Entry("Aggregated Camel catalog for " + categoryName, camelVersion, outputFileName);
            index.getCatalogs().put(categoryName, indexEntry);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void processCatalogFile(Path catalog, ObjectNode targetObject) {
        var splitted = catalog.getFileName().toString().split("\\.");
        if (splitted.length < 2) {
            getLog().error(new Exception("Invalid file name: " + catalog.getFileName()));
            return;
        }
        try {
            var catalogNode = jsonMapper.readTree(catalog.toFile());
            targetObject.putIfAbsent(splitted[0], catalogNode);
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
        var splitted = file.getFileName().toString().split("\\.");
        if (splitted.length < 2) {
            getLog().error(new Exception("Invalid file name: " + file.getFileName()));
            return;
        }
        var outputFileName = String.format(
                "%s-%s-%s.json", CRD_SCHEMA, splitted[0], camelKCRDVersion);
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            var crd = yamlMapper.readValue(file.toFile(), CustomResourceDefinition.class);
            var schema = crd.getSpec().getVersions().get(0).getSchema().getOpenAPIV3Schema();
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), schema);
            var displayName = crd.getSpec().getNames().getKind();
            var indexEntry = new Entry(
                    "Camel K Custom Resource JSON schema for " + displayName,
                    camelKCRDVersion,
                    outputFileName);
            index.getSchemas().add(indexEntry);
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
            Files.list(kameletsDir)
                    .sorted()
                    .forEach(f -> processKameletFile(f, root));
            var outputFileName = String.format("%s-%s.json", KAMELETS_AGGREGATE, kameletsVersion);
            var output = outputDirectory.toPath().resolve(outputFileName);
            JsonFactory jsonFactory = new JsonFactory();
            var writer = new FileWriter(output.toFile());
            var jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(jsonGenerator, root);
            var indexEntry = new Entry(
                    "Aggregated Kamelet definitions in JSON",
                    kameletsVersion,
                    outputFileName);
            index.getKamelets().add(indexEntry);
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
            var kameletYaml = yamlMapper.readTree(kamelet.toFile());
            targetObject.putIfAbsent(splitted[0], kameletYaml);
        } catch (Exception e) {
            getLog().error(e);
        }

    }
}
