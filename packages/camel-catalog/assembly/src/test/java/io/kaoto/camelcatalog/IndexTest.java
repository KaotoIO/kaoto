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
        var schemas = index.withObject("/schemas");
        assertTrue(schemas.has("camelYamlDsl"));
        assertTrue(schemas.has("beans"));
        assertTrue(schemas.has("errorHandler"));
        assertTrue(schemas.has("from"));
        assertTrue(schemas.has("intercept"));
        assertTrue(schemas.has("interceptFrom"));
        assertTrue(schemas.has("interceptSendToEndpoint"));
        assertTrue(schemas.has("onCompletion"));
        assertTrue(schemas.has("onException"));
        assertTrue(schemas.has("rest"));
        assertTrue(schemas.has("restConfiguration"));
        assertTrue(schemas.has("route"));
        assertTrue(schemas.has("routeConfiguration"));
        assertTrue(schemas.has("routeTemplate"));
        assertTrue(schemas.has("templatedRoute"));
        assertTrue(schemas.has("Integration"));
        assertTrue(schemas.has("Kamelet"));
        assertTrue(schemas.has("KameletBinding"));
        assertTrue(schemas.has("Pipe"));
    }
}
