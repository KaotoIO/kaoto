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

public class CatalogCliArgument {
    private CatalogRuntime runtime;
    private String catalogVersion;

    public CatalogCliArgument() {
    }

    public CatalogCliArgument(CatalogRuntime runtime, String version) {
        this.runtime = runtime;
        this.catalogVersion = version;
    }

    public CatalogRuntime getRuntime() {
        return runtime;
    }

    public void setRuntime(CatalogRuntime runtime) {
        this.runtime = runtime;
    }

    public String getCatalogVersion() {
        return catalogVersion;
    }

    public void setCatalogVersion(String version) {
        this.catalogVersion = version;
    }

    @Override
    public String toString() {
        return "CatalogCliArgument{" +
                "runtime=" + runtime +
                ", version='" + catalogVersion + '\'' +
                '}';
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((runtime == null) ? 0 : runtime.hashCode());
        result = prime * result + ((catalogVersion == null) ? 0 : catalogVersion.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;

        CatalogCliArgument other = (CatalogCliArgument) obj;
        return runtime == other.runtime && catalogVersion.equals(other.catalogVersion);
    }
}
