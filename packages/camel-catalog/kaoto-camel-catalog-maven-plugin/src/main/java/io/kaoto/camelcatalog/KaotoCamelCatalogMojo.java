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
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.MojoFailureException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.apache.maven.plugins.annotations.ResolutionScope;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
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
    private static final String CAMEL_YAML_DSL = "camelYamlDsl";
    private static final String K8S_V1_OPENAPI = "kubernetes-api-v1-openapi";
    private static final String CAMEL_CATALOG_AGGREGATE = "camel-catalog-aggregate";
    private static final String CRDS = "crds";
    private static final String CRD_SCHEMA = "crd-schema";
    private static final String KAMELETS = "kamelets";
    private static final String KAMELETS_AGGREGATE = "kamelets-aggregate";

    private static final ObjectMapper jsonMapper = new ObjectMapper()
            .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    private static final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    private static final JsonFactory jsonFactory = new JsonFactory();

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

    @Parameter
    private List<String> kubernetesDefinitions;

    @Parameter
    private List<String> additionalSchemas;

    public void execute() throws MojoExecutionException, MojoFailureException {
        if (!inputDirectory.exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "inputDirectory '%s' does not exist", inputDirectory.getName())));
            return;
        }
        outputDirectory.mkdirs();
        var path = inputDirectory.toPath();
        var index = new Index();
        processCamelSchema(path, index);
        processK8sSchema(path, index);
        processCatalog(path, index);
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

    private void processCamelSchema(Path inputDir, Index index) {
        var schema = inputDir.resolve(SCHEMA).resolve(CAMEL_YAML_DSL + ".json");
        if (!schema.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Camel YAML DSL JSON Schema file not found: %s",
                    schema
            )));
            return;
        }
        var outputFileName = CAMEL_YAML_DSL + ".json";
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            output.getParent().toFile().mkdirs();
            Files.copy(schema, output, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            getLog().error(e);
            return;
        }
        var indexEntry = new Entry(
                "camelYamlDsl",
                "Camel YAML DSL JSON schema",
                camelVersion,
                outputFileName);
        index.getSchemas().put("camelYamlDsl", indexEntry);

        try {
            var rootSchema = (ObjectNode) jsonMapper.readTree(schema.toFile());
            var items = rootSchema.withObject("/items");
            var properties = items.withObject("/properties");
            var definitions = items.withObject("/definitions");
            var relocatedDefinitions = relocateToRootDefinitions(definitions);
            properties.properties().forEach(p -> processSubSchema(p, relocatedDefinitions, rootSchema, index));
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private ObjectNode relocateToRootDefinitions(ObjectNode definitions) {
        var relocatedDefinitions = definitions.deepCopy();
        relocatedDefinitions.findParents("$ref").stream()
                .map(ObjectNode.class::cast)
                .forEach(n -> n.put("$ref", getRelocatedRef(n)));
        return relocatedDefinitions;
    }

    private String getRelocatedRef(ObjectNode parent) {
        return parent.get("$ref").asText().replace("#/items/definitions/", "#/definitions/");
    }

    private void processSubSchema(
            java.util.Map.Entry<String, JsonNode> prop,
            ObjectNode definitions,
            ObjectNode rootSchema,
            Index index
    ) {
        var propName = prop.getKey();
        var answer = (ObjectNode) prop.getValue().deepCopy();
        if (answer.has("$ref") && definitions.has(getNameFromRef((ObjectNode)answer))) {
            answer = definitions.withObject("/" + getNameFromRef((ObjectNode)answer)).deepCopy();

        }
        answer.set("$schema", rootSchema.get("$schema"));
        populateDefinitions(answer, definitions);
        var outputFileName = String.format("%s-%s.json", CAMEL_YAML_DSL, propName);
        var output = outputDirectory.toPath().resolve(outputFileName);
        try {
            output.getParent().toFile().mkdirs();
            var writer = new FileWriter(output.toFile());
            JsonGenerator gen = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(gen, answer);
            var indexEntry = new Entry(
                    propName,
                    "Camel YAML DSL JSON schema: " + propName,
                    camelVersion,
                    outputFileName);
            index.getSchemas().put(propName, indexEntry);
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private String getNameFromRef(ObjectNode parent) {
        var ref = parent.get("$ref").asText();
        return ref.contains("items") ? ref.replace("#/items/definitions/", "")
                : ref.replace("#/definitions/", "");
    }

    private void populateDefinitions(ObjectNode schema, ObjectNode definitions) {
        var schemaDefinitions = schema.withObject("/definitions");
        boolean added = true;
        while(added) {
            added = false;
            for (JsonNode refParent : schema.findParents("$ref")) {
                var name = getNameFromRef((ObjectNode) refParent);
                if (!schemaDefinitions.has(name)) {
                    schemaDefinitions.set(name, definitions.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }

    private void processK8sSchema(Path inputDir, Index index) {
        var schema = inputDir.resolve(SCHEMA).resolve(K8S_V1_OPENAPI + ".json");
        if (!schema.toFile().exists()) {
            getLog().error(new IllegalArgumentException(String.format(
                    "Kubernetes OpenAPI JSON Schema file not found: %s",
                    schema
            )));
            return;
        }

        try {
            var k8sSchemas = jsonMapper.readTree(schema.toFile()).withObject("/components/schemas");
            if (kubernetesDefinitions != null) {
                for (String name : kubernetesDefinitions) {
                    var definition = jsonMapper.createObjectNode();
                    definition.put("$schema", "http://json-schema.org/draft-07/schema#");
                    definition.put("additionalProperties", false);
                    definition.setAll(k8sSchemas.withObject("/" + name));
                    populateReferences(definition, k8sSchemas);
                    definition = removeKubernetesCustomKeywords(definition);
                    var nameSplit = name.split("\\.");
                    var displayName = nameSplit[nameSplit.length - 1];
                    // ATM we use only few of k8s schemas, so use the short name until we see a conflict
                    var outputFileName = String.format("%s-%s.json", K8S_V1_OPENAPI, displayName);
                    var output = outputDirectory.toPath().resolve(outputFileName);
                    var writer = new FileWriter(output.toFile());
                    JsonGenerator jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
                    jsonMapper.writeTree(jsonGenerator, definition);
                    var indexEntry = new Entry(
                            displayName,
                            "Kubernetes OpenAPI JSON schema: " + name,
                            "v1",
                            outputFileName);
                    index.getSchemas().put(displayName, indexEntry);
                };
            }
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private void populateReferences(ObjectNode definition, ObjectNode k8sSchemas) {
        var added = true;
        while (added) {
            added = false;
            for (JsonNode refParent : definition.findParents("$ref")) {
                var ref = refParent.get("$ref").asText();
                if (ref.startsWith("#/components")) {
                    ((ObjectNode)refParent).put("$ref", ref.replace("#/components/schemas", "#/definitions"));
                    ref = refParent.get("$ref").asText();
                }
                var name = ref.replace("#/definitions/", "");
                if (!definition.has("definitions") || !definition.withObject("/definitions").has(name)) {
                    var additionalDefinitions = definition.withObject("/definitions");
                    additionalDefinitions.set(name, k8sSchemas.withObject("/" + name));
                    added = true;
                    break;
                }
            }
        }
    }

    private ObjectNode removeKubernetesCustomKeywords(ObjectNode definition) {
        var modified = jsonMapper.createObjectNode();
        definition.fields().forEachRemaining(node -> {
            if (!node.getKey().startsWith("x-kubernetes")) {
                var value = node.getValue();
                if (value.isObject()) {
                    value = removeKubernetesCustomKeywords((ObjectNode)value);
                } else if (value.isArray()) {
                    value = removeKubernetesCustomKeywordsFromArrayNode((ArrayNode)value);
                }
                modified.set(node.getKey(), value);
            }
        });
        return modified;
    }

    private ArrayNode removeKubernetesCustomKeywordsFromArrayNode(ArrayNode definition) {
        var modified = jsonMapper.createArrayNode();
        definition.forEach(node -> {
            if (node.isObject()) {
                node = removeKubernetesCustomKeywords((ObjectNode)node);
            } else if (node.isArray()) {
                node = removeKubernetesCustomKeywordsFromArrayNode((ArrayNode)node);
            }
            modified.add(node);
        });
        return modified;
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
                    .filter(f -> isSupportedCatalogCategory(f))
                    .sorted()
                    .forEach(f -> processCatalogCategory(f, index));
        } catch (Exception e) {
            getLog().error(e);
        }
    }

    private boolean isSupportedCatalogCategory(Path category) {
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
                    "%s-%s.json", CAMEL_CATALOG_AGGREGATE, categoryName);
            var output = outputDirectory.toPath().resolve(outputFileName);
            JsonFactory jsonFactory = new JsonFactory();
            var writer = new FileWriter(output.toFile());
            var jsonGenerator = jsonFactory.createGenerator(writer).useDefaultPrettyPrinter();
            jsonMapper.writeTree(jsonGenerator, targetObject);
            var indexEntry = new Entry(
                    categoryName,
                    "Aggregated Camel catalog for " + categoryName,
                    camelVersion,
                    outputFileName);
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
            Files.list(kameletsDir)
                    .sorted()
                    .forEach(f -> processKameletFile(f, root));
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
