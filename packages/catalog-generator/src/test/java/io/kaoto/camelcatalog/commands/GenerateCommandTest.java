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
package io.kaoto.camelcatalog.commands;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.generator.CatalogGenerator;
import io.kaoto.camelcatalog.generator.CatalogGeneratorBuilder;
import io.kaoto.camelcatalog.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

import java.io.File;
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class GenerateCommandTest {
    @TempDir
    File tempDir;

    private GenerateCommand generateCommand;
    private CatalogDefinition catalogDefinition;

    @BeforeEach
    void setUp() {
        catalogDefinition = new CatalogDefinition();
        catalogDefinition.setFileName("index.json");
        catalogDefinition.setName("test-camel-catalog");
        catalogDefinition.setVersion("4.8.0");
        catalogDefinition.setRuntime(CatalogRuntime.Main);

        CatalogCliArgument catalogCliArg = new CatalogCliArgument();
        catalogCliArg.setRuntime(CatalogRuntime.Main);
        catalogCliArg.setCatalogVersion("4.8.0");

        ConfigBean configBean = new ConfigBean();
        configBean.setOutputFolder(tempDir.toString());
        configBean.setCatalogsName("test-camel-catalog");
        configBean.addCatalogVersion(catalogCliArg);
        configBean.setKameletsVersion("1.0.0");

        generateCommand = new GenerateCommand(configBean);
    }

    @Test
    void testGeneratorCalledWithCorrectParameters() {
        try (var mockedBuilder = mockConstruction(CatalogGeneratorBuilder.class, (mockBuilder, context) -> {
            when(mockBuilder.withRuntime(any(CatalogRuntime.class))).thenCallRealMethod().thenReturn(mockBuilder);
            when(mockBuilder.withCamelCatalogVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
            when(mockBuilder.withKameletsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
            when(mockBuilder.withCamelKCRDsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
            when(mockBuilder.withVerbose(anyBoolean())).thenCallRealMethod().thenReturn(mockBuilder);

            when(mockBuilder.withOutputDirectory(any(File.class))).thenReturn(mockBuilder);
            when(mockBuilder.build()).thenAnswer(invocation -> {
                CatalogGenerator catalogGenerator = mock(CatalogGenerator.class);
                when(catalogGenerator.generate()).thenReturn(catalogDefinition);
                return catalogGenerator;
            });
        })) {
            generateCommand.run();

            CatalogGeneratorBuilder builder = mockedBuilder.constructed().get(0);

            verify(builder, times(1)).withRuntime(CatalogRuntime.Main);
            verify(builder, times(1)).withCamelCatalogVersion("4.8.0");
            verify(builder, times(1)).withKameletsVersion("1.0.0");
            verify(builder, times(1)).withCamelKCRDsVersion("2.3.1");

            File expectedFolder = new File(tempDir, "camel-main/4.8.0");
            verify(builder, times(1)).withOutputDirectory(expectedFolder);

            /* This path will be used to relatively load the subsequent files, it always needs to use `/` */
            String expectedFile = "camel-main/4.8.0/index.json";
            assertEquals(expectedFile, catalogDefinition.getFileName());
        }
    }

    @Test
    void testCatalogLibraryOutput() {
        var ref = new Object() {
            Integer version = null;
            String name = null;
        };

        try (
                var mockedBuilder = mockConstruction(CatalogGeneratorBuilder.class, (mockBuilder, context) -> {
                    when(mockBuilder.withRuntime(any(CatalogRuntime.class))).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withCamelCatalogVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withKameletsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withCamelKCRDsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withVerbose(anyBoolean())).thenCallRealMethod().thenReturn(mockBuilder);

                    when(mockBuilder.withOutputDirectory(any(File.class))).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenAnswer(invocation -> {
                        CatalogGenerator catalogGenerator = mock(CatalogGenerator.class);
                        when(catalogGenerator.generate()).thenReturn(catalogDefinition);
                        return catalogGenerator;
                    });
                });
                var mockedLibrary = mockConstruction(CatalogLibrary.class, (mockLibrary, context) -> {
                    ref.version = (Integer) context.arguments().get(0);
                    ref.name = (String) context.arguments().get(1);
                    mockLibrary.definitions = new ArrayList<>();
                    doCallRealMethod().when(mockLibrary).getName();
                    doCallRealMethod().when(mockLibrary).getDefinitions();
                    doCallRealMethod().when(mockLibrary).addDefinition(any(CatalogDefinition.class));
                })
        ) {
            generateCommand.run();

            CatalogLibrary library = mockedLibrary.constructed().get(0);

            assertEquals(1, mockedLibrary.constructed().size());
            assertEquals(2, ref.version);
            assertEquals("test-camel-catalog", ref.name);
            assertEquals(1, library.getDefinitions().size());

            CatalogLibraryEntry catalogLibraryEntry = library.getDefinitions().get(0);
            assertEquals("test-camel-catalog", catalogLibraryEntry.name());
            assertEquals("4.8.0", catalogLibraryEntry.version());
            assertEquals("Main", catalogLibraryEntry.runtime());

            /* This path will be used to relatively load the subsequent files, it always needs to use `/` */
            String expectedFile = "camel-main/4.8.0/index.json";
            assertEquals(expectedFile, catalogLibraryEntry.fileName());
        }
    }
}
