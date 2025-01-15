package io.kaoto.camelcatalog.generators;

import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.dsl.yaml.YamlRoutesBuilderLoader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;

class EIPGeneratorTest {
    EIPGenerator eipGenerator;

    @BeforeEach
    void setUp() throws IOException {
        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        String camelYamlSchema;
        try (var is = YamlRoutesBuilderLoader.class.getClassLoader().getResourceAsStream("schema/camelYamlDsl.json")) {
            assert is != null;
            camelYamlSchema = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        eipGenerator = new EIPGenerator(camelCatalog, camelYamlSchema);
    }

    @Test
    void shouldContainAListOfEips() {
        var eipsMap = eipGenerator.generate();

        assertTrue(eipsMap.containsKey("aggregate"));
        assertTrue(eipsMap.containsKey("to"));
        assertTrue(eipsMap.containsKey("setHeader"));
        assertTrue(eipsMap.containsKey("setHeaders"));

        assertTrue(eipsMap.containsKey("choice"));
        assertTrue(eipsMap.containsKey("doTry"));

        /* These are special cases, while they are processors, they cannot be used directly */
        assertTrue(eipsMap.containsKey("when"));
        assertTrue(eipsMap.containsKey("otherwise"));
        assertTrue(eipsMap.containsKey("doCatch"));
        assertTrue(eipsMap.containsKey("doFinally"));
    }
}