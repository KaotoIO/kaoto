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

public enum CatalogRuntime {
    Main("Main"),
    Quarkus("Quarkus"),
    SpringBoot("Spring Boot");

    private final String label;

    private CatalogRuntime(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static CatalogRuntime fromString(String name) {
        for (CatalogRuntime runtime : CatalogRuntime.values()) {
            if (runtime.name().equalsIgnoreCase(name)) {
                return runtime;
            }
        }

        throw new IllegalArgumentException("No enum found with name: " + name);
    }
}
