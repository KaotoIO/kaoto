package io.kaoto.camelcatalog.commands;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.generator.CatalogGenerator;
import io.kaoto.camelcatalog.generator.CatalogGeneratorBuilder;
import io.kaoto.camelcatalog.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

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

            assertEquals(catalogDefinition.getFileName(), "camel-main/4.8.0/index.json");
        }
    }

    @Test
    void testCatalogLibraryOutput() {
        try (
                var mockedBuilder = mockConstruction(CatalogGeneratorBuilder.class, (mockBuilder, context) -> {
                    when(mockBuilder.withRuntime(any(CatalogRuntime.class))).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withCamelCatalogVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withKameletsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);
                    when(mockBuilder.withCamelKCRDsVersion(anyString())).thenCallRealMethod().thenReturn(mockBuilder);

                    when(mockBuilder.withOutputDirectory(any(File.class))).thenReturn(mockBuilder);
                    when(mockBuilder.build()).thenAnswer(invocation -> {
                        CatalogGenerator catalogGenerator = mock(CatalogGenerator.class);
                        when(catalogGenerator.generate()).thenReturn(catalogDefinition);
                        return catalogGenerator;
                    });
                });
                var mockedLibrary = mockConstruction(CatalogLibrary.class, (mockLibrary, context) -> {
                    mockLibrary.definitions = new ArrayList<>();
                    doCallRealMethod().when(mockLibrary).getName();
                    doCallRealMethod().when(mockLibrary).setName(anyString());
                    doCallRealMethod().when(mockLibrary).getDefinitions();
                    doCallRealMethod().when(mockLibrary).addDefinition(any(CatalogDefinition.class));
                })
        ) {
            generateCommand.run();

            CatalogLibrary library = mockedLibrary.constructed().get(0);

            assertEquals(library.getName(), "test-camel-catalog");
            assertEquals(library.getDefinitions().size(), 1);

            CatalogLibraryEntry catalogLibraryEntry = library.getDefinitions().get(0);
            assertEquals(catalogLibraryEntry.name(), "test-camel-catalog");
            assertEquals(catalogLibraryEntry.version(), "4.8.0");
            assertEquals(catalogLibraryEntry.runtime(), "Main");
            assertEquals(catalogLibraryEntry.fileName(), "camel-main/4.8.0/index.json");
        }
    }
}