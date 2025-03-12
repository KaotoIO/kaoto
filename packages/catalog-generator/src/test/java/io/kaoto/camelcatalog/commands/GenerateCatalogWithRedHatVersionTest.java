package io.kaoto.camelcatalog.commands;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.io.File;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.model.CatalogCliArgument;
import io.kaoto.camelcatalog.model.CatalogDefinition;
import io.kaoto.camelcatalog.model.CatalogRuntime;

class GenerateCatalogWithRedHatVersionTest {

    @TempDir
    File tempDir;

	@Test
	void testOK() throws Exception {
        CatalogDefinition catalogDefinition = new CatalogDefinition();
        catalogDefinition.setFileName("index.json");
        catalogDefinition.setName("test-camel-catalog");
        catalogDefinition.setVersion("4.4.0.redhat-00045");
        catalogDefinition.setRuntime(CatalogRuntime.Main);

        CatalogCliArgument catalogCliArg = new CatalogCliArgument();
        catalogCliArg.setRuntime(CatalogRuntime.Main);
        catalogCliArg.setCatalogVersion("4.4.0.redhat-00045");

        ConfigBean configBean = new ConfigBean();
        configBean.setOutputFolder(tempDir.toString());
        configBean.setCatalogsName("test-camel-catalog");
        configBean.addCatalogVersion(catalogCliArg);
        configBean.setKameletsVersion("1.0.0");

        GenerateCommand generateCommand = new GenerateCommand(configBean);
        
        generateCommand.run();
        
        assertTrue(new File(tempDir, "camel-main/4.4.0.redhat-00045").exists(), "The folder for the catalog wasn't created");
        assertEquals(15, new File(tempDir, "camel-main/4.4.0.redhat-00045").listFiles().length, "The folder for the catalog doesn't contain the correct number of files");
	}
	
}
