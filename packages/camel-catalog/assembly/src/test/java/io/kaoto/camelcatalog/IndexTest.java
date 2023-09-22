package io.kaoto.camelcatalog;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class IndexTest extends CamelCatalogTestSupport {

    @Test
    public void test() throws Exception {
        var index = getIndex();
        assertTrue(index.has("catalogs"));
        var catalogs = index.withObject("/catalogs");
        assertTrue(catalogs.has("models"));
        assertTrue(catalogs.has("components"));
        assertTrue(catalogs.has("languages"));
        assertTrue(catalogs.has("kamelets"));
        assertTrue(catalogs.has("dataformats"));
        assertTrue(index.has("schemas"));
        var schemas = index.withArray("/schemas");
        List<String> names = new ArrayList<>();
        schemas.forEach(schema -> names.add(schema.get("name").asText()));
        assertTrue(names.contains("camelYamlDsl"));
        assertTrue(names.contains("beans"));
        assertTrue(names.contains("errorHandler"));
        assertTrue(names.contains("from"));
        assertTrue(names.contains("intercept"));
        assertTrue(names.contains("interceptFrom"));
        assertTrue(names.contains("interceptSendToEndpoint"));
        assertTrue(names.contains("onCompletion"));
        assertTrue(names.contains("onException"));
        assertTrue(names.contains("rest"));
        assertTrue(names.contains("restConfiguration"));
        assertTrue(names.contains("route"));
        assertTrue(names.contains("routeConfiguration"));
        assertTrue(names.contains("routeTemplate"));
        assertTrue(names.contains("templatedRoute"));
        assertTrue(names.contains("Integration"));
        assertTrue(names.contains("Kamelet"));
        assertTrue(names.contains("KameletBinding"));
        assertTrue(names.contains("Pipe"));
    }
}
