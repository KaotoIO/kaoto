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
package io.kaoto.camelcatalog.maven;

import io.kaoto.camelcatalog.model.CatalogRuntime;
import io.kaoto.camelcatalog.model.Constants;
import io.kaoto.camelcatalog.model.MavenCoordinates;
import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.DefaultRuntimeProvider;
import org.apache.camel.catalog.quarkus.QuarkusRuntimeProvider;
import org.apache.camel.springboot.catalog.SpringBootRuntimeProvider;

import java.io.IOException;
import java.io.InputStream;
import java.net.JarURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.logging.Level;
import java.util.logging.Logger;

public class CamelCatalogVersionLoader {
    private static final Logger LOGGER = Logger.getLogger(CamelCatalogVersionLoader.class.getName());
    private final KaotoMavenVersionManager kaotoVersionManager = new KaotoMavenVersionManager();
    private final CamelCatalog camelCatalog = new DefaultCamelCatalog(true);
    private final Map<String, String> kameletBoundaries = new HashMap<>();
    private final Map<String, String> kamelets = new HashMap<>();
    private final List<String> camelKCRDs = new ArrayList<>();
    private final Map<String, String> localSchemas = new HashMap<>();
    private final Map<String, String> kaotoPatterns = new HashMap<>();
    private final CatalogRuntime runtime;
    private String camelYamlDSLSchema;
    private String kubernetesSchema;
    private boolean verbose = false;

    public CamelCatalogVersionLoader(CatalogRuntime runtime, boolean verbose) {
        this.runtime = runtime;
        this.verbose = verbose;
        kaotoVersionManager.setLog(verbose);
        camelCatalog.setVersionManager(kaotoVersionManager);
    }

    public CatalogRuntime getRuntime() {
        return runtime;
    }

    public CamelCatalog getCamelCatalog() {
        return camelCatalog;
    }

    public String getCamelYamlDslSchema() {
        return camelYamlDSLSchema;
    }

    public List<String> getKameletBoundaries() {
        return kameletBoundaries.values().stream().toList();
    }

    public List<String> getKamelets() {
        return kamelets.values().stream().toList();
    }

    public String getKubernetesSchema() {
        return kubernetesSchema;
    }

    public List<String> getCamelKCRDs() {
        return camelKCRDs;
    }

    public Map<String, String> getLocalSchemas() {
        return localSchemas;
    }

    public Map<String, String> getKaotoPatterns() {
        return kaotoPatterns;
    }

    public boolean loadCamelCatalog(String version) {
        if (version != null) {
            configureRepositories(version);
            MavenCoordinates mavenCoordinates = getCatalogMavenCoordinates(runtime, version);
            loadDependencyInClasspath(mavenCoordinates);
        }

        /**
         * Check the current runtime, so we can apply the corresponding RuntimeProvider
         * to the catalog
         */
        switch (runtime) {
            case Quarkus:
                camelCatalog.setRuntimeProvider(new QuarkusRuntimeProvider());
                break;
            case SpringBoot:
                camelCatalog.setRuntimeProvider(new SpringBootRuntimeProvider());
                break;
            default:
                camelCatalog.setRuntimeProvider(new DefaultRuntimeProvider());
                break;
        }

        return camelCatalog.getCatalogVersion() != null;
    }

    public boolean loadCamelYamlDsl(String version) {
        MavenCoordinates mavenCoordinates = getYamlDslMavenCoordinates(runtime, version);
        loadDependencyInClasspath(mavenCoordinates);

        ClassLoader classLoader = kaotoVersionManager.getClassLoader();
        URL resourceURL = classLoader.getResource(Constants.CAMEL_YAML_DSL_ARTIFACT);
        if (resourceURL == null) {
        	LOGGER.log(Level.SEVERE, "No " + Constants.CAMEL_YAML_DSL_ARTIFACT + " file found in the classpath");
            return false;
        }

        try (InputStream inputStream = resourceURL.openStream()) {
            try (Scanner scanner = new Scanner(inputStream)) {
                scanner.useDelimiter("\\A");
                camelYamlDSLSchema = scanner.hasNext() ? scanner.next() : "";
            }
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
            return false;
        }

        return camelYamlDSLSchema != null;
    }

    public boolean loadKameletBoundaries() {
        loadResourcesFromFolderAsString("kamelet-boundaries", kameletBoundaries, ".kamelet.yaml");
        return !kameletBoundaries.isEmpty();
    }

    public boolean loadKamelets(String version) {
        if (version != null) {
            // If the version is null, we load the installed version
            MavenCoordinates mavenCoordinates = new MavenCoordinates(Constants.APACHE_CAMEL_KAMELETS_ORG,
                    Constants.KAMELETS_PACKAGE,
                    version);
            loadDependencyInClasspath(mavenCoordinates);
        }

        loadResourcesFromFolderAsString("kamelets", kamelets, ".kamelet.yaml");

        return !kamelets.isEmpty();
    }

    public boolean loadKubernetesSchema() {
        String url = "https://raw.githubusercontent.com/kubernetes/kubernetes/master/api/openapi-spec/v3/api__v1_openapi.json";

        try (InputStream in = new URI(url).toURL().openStream();
                Scanner scanner = new Scanner(in, StandardCharsets.UTF_8.name())) {
            scanner.useDelimiter("\\A");
            kubernetesSchema = scanner.hasNext() ? scanner.next() : "";
        } catch (IOException | URISyntaxException e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
            return false;
        }

        return true;
    }

    public boolean loadCamelKCRDs(String version) {
        MavenCoordinates mavenCoordinates = new MavenCoordinates(Constants.APACHE_CAMEL_K_ORG,
                Constants.CAMEL_K_CRDS_PACKAGE,
                version);
        boolean areCamelKCRDsLoaded = loadDependencyInClasspath(mavenCoordinates);

        ClassLoader classLoader = kaotoVersionManager.getClassLoader();

        for (String crd : Constants.CAMEL_K_CRDS_ARTIFACTS) {
            URL resourceURL = classLoader.getResource(crd);
            if (resourceURL == null) {
                return false;
            }

            try (InputStream inputStream = resourceURL.openStream()) {
                try (Scanner scanner = new Scanner(inputStream)) {
                    scanner.useDelimiter("\\A");
                    camelKCRDs.add(scanner.hasNext() ? scanner.next() : "");
                }
            } catch (IOException e) {
                LOGGER.log(Level.SEVERE, e.toString(), e);
                return false;
            }
        }

        return areCamelKCRDsLoaded;
    }

    public void loadLocalSchemas() {
        loadResourcesFromFolderAsString("schemas", localSchemas, ".json");
    }

    public void loadKaotoPatterns() {
        loadResourcesFromFolderAsString("kaoto-patterns", kaotoPatterns, ".json");
    }

    private void configureRepositories(String version) {
        if (kaotoVersionManager.repositories.get("central") == null)
            kaotoVersionManager.addMavenRepository("central", "https://repo1.maven.org/maven2/");

        if (version.contains("redhat") && kaotoVersionManager.repositories.get("maven.redhat.ga") == null)
            kaotoVersionManager.addMavenRepository("maven.redhat.ga", "https://maven.repository.redhat.com/ga/");
    }

    private void loadResourcesFromFolderAsString(String resourceFolderName, Map<String, String> filesMap,
            String fileSuffix) {
        ClassLoader classLoader = kaotoVersionManager.getClassLoader();

        try {
            Iterator<URL> it = classLoader.getResources(resourceFolderName).asIterator();

            while (it.hasNext()) {
                URL resourceUrl = it.next();

                if ("jar".equals(resourceUrl.getProtocol())) {
                    JarURLConnection connection = (JarURLConnection) resourceUrl.openConnection();
                    JarFile jarFile = connection.getJarFile();
                    Enumeration<JarEntry> entries = jarFile.entries();

                    while (entries.hasMoreElements()) {
                        JarEntry entry = entries.nextElement();
                        if (entry.getName().startsWith(connection.getEntryName()) && !entry.isDirectory()
                                && entry.getName().endsWith(fileSuffix)) {

                            if (verbose) {
                                LOGGER.log(Level.INFO, () -> "Parsing: " + entry.getName());
                            }

                            try (InputStream inputStream = jarFile.getInputStream(entry)) {
                                try (Scanner scanner = new Scanner(inputStream)) {
                                    scanner.useDelimiter("\\A");
                                    String filenameWithoutExtension = entry.getName()
                                            .replace(resourceFolderName + "/", "")
                                            .replace(fileSuffix, "");
                                    filesMap.put(filenameWithoutExtension, scanner.hasNext() ? scanner.next() : "");
                                }
                            } catch (IOException e) {
                                LOGGER.log(Level.SEVERE, e.toString(), e);
                            }
                        }
                    }
                } else if ("file".equals(resourceUrl.getProtocol())) {
                    try (var pathWalker = Files.walk(Paths.get(resourceUrl.toURI()))) {
                        pathWalker.filter(Files::isRegularFile)
                                .filter(path -> path.toString().endsWith(fileSuffix))
                                .forEach(path -> {
                                    if (verbose) {
                                        LOGGER.log(Level.INFO, () -> "Parsing: " + path.toString());
                                    }

                                    try {
                                        String filenameWithoutExtension = path.toFile().getName().substring(0,
                                                path.toFile().getName().lastIndexOf('.'));
                                        filesMap.put(filenameWithoutExtension, new String(Files.readAllBytes(path)));
                                    } catch (IOException e) {
                                        LOGGER.log(Level.SEVERE, e.toString(), e);
                                    }
                                });
                    } catch (IOException | URISyntaxException e) {
                        LOGGER.log(Level.SEVERE, e.toString(), e);
                    }
                }
            }
        } catch (IOException e) {
            LOGGER.log(Level.SEVERE, e.toString(), e);
        }
    }

    private MavenCoordinates getCatalogMavenCoordinates(CatalogRuntime runtime, String version) {
        switch (runtime) {
            case Quarkus:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG + ".quarkus", "camel-quarkus-catalog", version);
            case SpringBoot:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG + ".springboot",
                        "camel-catalog-provider-springboot",
                        version);
            default:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG, "camel-catalog", version);
        }
    }

    private MavenCoordinates getYamlDslMavenCoordinates(CatalogRuntime runtime, String version) {
        switch (runtime) {
            case Quarkus:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG + ".quarkus", "camel-quarkus-yaml-dsl", version);
            case SpringBoot:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG + ".springboot", "camel-yaml-dsl-starter",
                        version);
            default:
                return new MavenCoordinates(Constants.APACHE_CAMEL_ORG,
                        Constants.CAMEL_YAML_DSL_PACKAGE,
                        version);
        }
    }

    /*
     * This method is used to load a dependency in the classpath. This is a
     * workaround
     * to load dependencies that are not in the classpath, while the Camel Catalog
     * exposes a method to load dependencies in the classpath.
     */
    private boolean loadDependencyInClasspath(MavenCoordinates mavenCoordinates) {
        return camelCatalog.loadRuntimeProviderVersion(mavenCoordinates.getGroupId(), mavenCoordinates.getArtifactId(),
                mavenCoordinates.getVersion());
    }
}
