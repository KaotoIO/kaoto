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
        List<String> props = new ArrayList<>();
        List<String> crds = new ArrayList<>();
        schemas.forEach(schema -> {
            var tokens = schema.get("file").asText().split("-");
            if ("camelYamlDsl".equals(tokens[0]) && !tokens[1].matches("^\\d+.*")) {
                props.add(tokens[1]);
            } else if ("crd".equals(tokens[0])) {
                crds.add(tokens[2]);
            }
        });
        assertTrue(props.contains("beans"));
        assertTrue(props.contains("errorHandler"));
        assertTrue(props.contains("from"));
        assertTrue(props.contains("intercept"));
        assertTrue(props.contains("interceptFrom"));
        assertTrue(props.contains("interceptSendToEndpoint"));
        assertTrue(props.contains("onCompletion"));
        assertTrue(props.contains("onException"));
        assertTrue(props.contains("rest"));
        assertTrue(props.contains("restConfiguration"));
        assertTrue(props.contains("route"));
        assertTrue(props.contains("routeConfiguration"));
        assertTrue(props.contains("routeTemplate"));
        assertTrue(props.contains("templatedRoute"));
        assertTrue(crds.contains("integrations"));
        assertTrue(crds.contains("kamelets"));
        assertTrue(crds.contains("kameletbindings"));
        assertTrue(crds.contains("pipes"));
    }
}
