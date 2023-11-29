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

import static org.junit.jupiter.api.Assertions.*;

public class KameletCatalogTest extends CamelCatalogTestSupport {

    @Test
    public void testKameletCatalog() throws Exception {
        var kameletsCatalog = getCatalog("kamelets");
        assertTrue(kameletsCatalog.has("kafka-source"));
        assertFalse(kameletsCatalog.has("source"));
        assertFalse(kameletsCatalog.has("sink"));
    }

    @Test
    public void testKameletBoundariesCatalog() throws Exception {
        var kameletsBoundariesCatalog = getCatalog("kameletBoundaries");
        assertFalse(kameletsBoundariesCatalog.has("kafka-source"));
        assertTrue(kameletsBoundariesCatalog.has("source"));
        assertTrue(kameletsBoundariesCatalog.has("sink"));
    }
}
