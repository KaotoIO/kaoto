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
