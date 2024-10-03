package io.kaoto.camelcatalog.model;

import java.util.ArrayList;
import java.util.List;

public class CatalogLibrary {
    /* Visible for testing */
    public List<CatalogLibraryEntry> definitions = new ArrayList<>();
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<CatalogLibraryEntry> getDefinitions() {
        return definitions;
    }

    public void addDefinition(CatalogDefinition catalogDefinition) {
        CatalogLibraryEntry entry = new CatalogLibraryEntry(
                catalogDefinition.getName(),
                catalogDefinition.getVersion(),
                catalogDefinition.getRuntime().getLabel(),
                catalogDefinition.getFileName());

        definitions.add(entry);
    }
}
