package io.kaoto.camelcatalog.generators;

import io.kaoto.camelcatalog.maven.CamelCatalogVersionLoader;
import io.kaoto.camelcatalog.model.CatalogRuntime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class CRDGeneratorTest {
    CRDGenerator crdGenerator;

    @BeforeEach
    void setUp() {
        CamelCatalogVersionLoader camelCatalogVersionLoader = new CamelCatalogVersionLoader(CatalogRuntime.Main, true);
        camelCatalogVersionLoader.loadCamelKCRDs("2.3.1");

        crdGenerator = new CRDGenerator(camelCatalogVersionLoader.getCamelKCRDs());
    }

    @Test
    void shouldContainAListOfComponents() {
        var crdsMap = crdGenerator.generate();

        assertTrue(crdsMap.containsKey("Integration"));
        assertTrue(crdsMap.containsKey("KameletBinding"));
        assertTrue(crdsMap.containsKey("Kamelet"));
        assertTrue(crdsMap.containsKey("Pipe"));
    }
}
