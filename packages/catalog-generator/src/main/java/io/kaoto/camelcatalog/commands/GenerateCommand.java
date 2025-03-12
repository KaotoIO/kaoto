package io.kaoto.camelcatalog.commands;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.generator.CatalogGeneratorBuilder;
import io.kaoto.camelcatalog.model.CatalogDefinition;
import io.kaoto.camelcatalog.model.CatalogLibrary;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.util.logging.Logger;

public class GenerateCommand implements Runnable {
    private static final Logger LOGGER = Logger.getLogger(GenerateCommand.class.getName());
    private final ConfigBean configBean;

    public GenerateCommand(ConfigBean configBean) {
        this.configBean = configBean;
    }

    @Override
    public void run() {
        LOGGER.info("Output folder: " + configBean.getOutputFolder() + "\n" +
                "Catalog versions: " + configBean.getCatalogVersionSet() + "\n" +
                "Kamelets version: " + configBean.getKameletsVersion());

        CatalogLibrary library = new CatalogLibrary(2, configBean.getCatalogsName());

        FileUtils.deleteQuietly(configBean.getOutputFolder());
        File outputFolder = createSubFolder(configBean.getOutputFolder());

        configBean.getCatalogVersionSet()
                .forEach(catalogCliArg -> {
                    String runtimeFolderName = "camel-" + catalogCliArg.getRuntime().name().toLowerCase();
                    File runtimeFolder = createSubFolder(outputFolder, runtimeFolderName);
                    File catalogDefinitionFolder = createSubFolder(runtimeFolder, catalogCliArg.getCatalogVersion());

                    LOGGER.info("Generating catalog: " + catalogCliArg.getRuntime() + " "
                            + catalogCliArg.getCatalogVersion() + "\n");

                    CatalogGeneratorBuilder builder = new CatalogGeneratorBuilder();
                    var catalogGenerator = builder.withRuntime(catalogCliArg.getRuntime())
                            .withCamelCatalogVersion(catalogCliArg.getCatalogVersion())
                            .withKameletsVersion(configBean.getKameletsVersion())
                            .withCamelKCRDsVersion("2.3.1")
                            .withOutputDirectory(catalogDefinitionFolder)
                            .withVerbose(configBean.isVerbose())
                            .build();

                    CatalogDefinition catalogDefinition = catalogGenerator.generate();
                    File indexFile = catalogDefinitionFolder.toPath().resolve(catalogDefinition.getFileName()).toFile();
                    String relateIndexFile = outputFolder.toPath().relativize(indexFile.toPath()).toString().replace(File.separator, "/");


                    catalogDefinition.setFileName(relateIndexFile);

                    library.addDefinition(catalogDefinition);
                });

        ObjectMapper jsonMapper = new ObjectMapper()
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

        var indexFile = outputFolder.toPath().resolve("index.json").toFile();
        try {
            jsonMapper.writerWithDefaultPrettyPrinter().writeValue(indexFile, library);
        } catch (IOException e) {
            throw new RuntimeException("Error writing index file", e);
        }

    }

    private File createSubFolder(File parentFolder, String folderName) {
        File newSubFolder = parentFolder.toPath().resolve(folderName).toFile();
        return createSubFolder(newSubFolder);
    }

    private File createSubFolder(File parentFolder) {
        File newSubFolder = parentFolder.toPath().toFile();
        if (!newSubFolder.exists()) {
            newSubFolder.mkdirs();
        }
        return newSubFolder;
    }
}
