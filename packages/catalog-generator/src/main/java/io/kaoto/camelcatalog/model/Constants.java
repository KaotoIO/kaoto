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
package io.kaoto.camelcatalog.model;

import java.util.List;

public class Constants {
        public static final String COMPONENTS = "components";
        public static final String DATAFORMATS = "dataformats";
        public static final String LANGUAGES = "languages";
        public static final String MODELS = "models";

        public static final String APACHE_CAMEL_ORG = "org.apache.camel";
        public static final String APACHE_CAMEL_KAMELETS_ORG = APACHE_CAMEL_ORG + ".kamelets";
        public static final String APACHE_CAMEL_K_ORG = APACHE_CAMEL_ORG + ".k";
        public static final String CAMEL_YAML_DSL_PACKAGE = "camel-yaml-dsl";
        public static final String KAMELETS_PACKAGE = "camel-kamelets";
        public static final String CAMEL_K_CRDS_PACKAGE = "camel-k-crds";

        public static final String CAMEL_YAML_DSL_ARTIFACT = "schema/camelYamlDsl.json";
        public static final List<String> CAMEL_K_CRDS_ARTIFACTS = List.of(
                        "camel.apache.org_integrations.yaml",
                        "camel.apache.org_kameletbindings.yaml",
                        "camel.apache.org_kamelets.yaml",
                        "camel.apache.org_pipes.yaml");

        public static final List<String> KUBERNETES_DEFINITIONS = List.of(
                        "io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta",
                        "io.k8s.api.core.v1.ObjectReference");

        public static final String SCHEMA = "schema";
        public static final String CAMEL_YAML_DSL_FILE_NAME = "camelYamlDsl";
        public static final String K8S_V1_OPENAPI = "kubernetes-api-v1-openapi";
        public static final String CAMEL_CATALOG_AGGREGATE = "camel-catalog-aggregate";
        public static final String CRD_SCHEMA = "crd-schema";
        public static final String KAMELETS = "kamelets";
        public static final String KAMELET_BOUNDARIES_KEY = "kameletBoundaries";
        public static final String KAMELET_BOUNDARIES_FILENAME = "kamelet-boundaries";
        public static final String KAMELETS_AGGREGATE = "kamelets-aggregate";

}
