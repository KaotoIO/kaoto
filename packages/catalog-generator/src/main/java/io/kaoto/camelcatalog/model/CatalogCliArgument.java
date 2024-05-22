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
