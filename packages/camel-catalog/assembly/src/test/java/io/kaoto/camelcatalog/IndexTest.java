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
package io.kaoto.camelcatalog;

import org.junit.jupiter.api.Test;

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
        assertTrue(catalogs.has("kameletBoundaries"));
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
