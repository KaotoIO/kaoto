package io.kaoto.camelcatalog.model;

public enum CatalogRuntime {
    Main,
    Quarkus,
    SpringBoot;

    public static CatalogRuntime fromString(String name) {
        for (CatalogRuntime runtime : CatalogRuntime.values()) {
            if (runtime.name().equalsIgnoreCase(name)) {
                return runtime;
            }
        }

        throw new IllegalArgumentException("No enum found with name: " + name);
    }
}
