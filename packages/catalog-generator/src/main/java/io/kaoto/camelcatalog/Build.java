package io.kaoto.camelcatalog;

import java.util.logging.Logger;

import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.commands.GenerateCommand;
import io.kaoto.camelcatalog.commands.GenerateCommandOptions;

public class Build {
    private static final Logger LOGGER = Logger.getLogger(Build.class.getName());

    public static void main(String[] args) {
        CamelCatalog catalog = new DefaultCamelCatalog();
        String camelMainVersion = catalog.getCatalogVersion();

        LOGGER.info("Building Camel Main Catalog: " + camelMainVersion);

        String[] localArgs = { "--output", "./dist", "--name", "Kaoto default catalog", "--main", camelMainVersion };
        ConfigBean configBean = GenerateCommandOptions.configure(localArgs);
        GenerateCommand generateCommand = new GenerateCommand(configBean);
        generateCommand.run();
    }
}
