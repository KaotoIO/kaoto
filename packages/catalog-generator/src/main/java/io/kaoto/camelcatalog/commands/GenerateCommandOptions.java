package io.kaoto.camelcatalog.commands;

import java.util.logging.Logger;

import org.apache.camel.catalog.CamelCatalog;
import org.apache.camel.catalog.DefaultCamelCatalog;
import org.apache.camel.catalog.quarkus.QuarkusRuntimeProvider;
import org.apache.camel.springboot.catalog.SpringBootRuntimeProvider;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Option;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.generator.Util;
import io.kaoto.camelcatalog.model.CatalogCliArgument;
import io.kaoto.camelcatalog.model.CatalogRuntime;

public class GenerateCommandOptions {
    private static final Logger LOGGER = Logger.getLogger(GenerateCommandOptions.class.getName());
    private Options options = new Options();
    private ConfigBean configBean;

    public GenerateCommandOptions(ConfigBean configBean) {
        this.configBean = configBean;
    }

    public void configure(String[] args) throws ParseException {
        Option outputOption = Option.builder().argName("outputDir").option("o").longOpt("output")
                .desc("Output directory. It will be cleaned before generating the catalogs").hasArg()
                .required()
                .build();
        Option catalogsNameOption = Option.builder().argName("catalogsName").option("n").longOpt("name")
                .desc("Catalog Name. It serves as human readable identifier of the catalog repository")
                .hasArg()
                .required()
                .build();
        Option kameletsVersionOption = Option.builder().argName("kameletsVersion").option("k")
                .longOpt("kamelets")
                .desc("Kamelets catalog version. If not specified, it will use the generator installed version")
                .hasArg().build();
        Option camelMainVersionOption = Option.builder().argName("version").option("m").longOpt("main")
                .desc("Camel Main version. If not specified, it will use the generator installed version")
                .hasArg().build();
        Option camelQuarkusVersionOption = Option.builder().argName("version").option("q").longOpt("quarkus")
                .desc("Camel Extensions for Quarkus version").hasArg().build();
        Option camelSpringbootVersionOption = Option.builder().argName("version").option("s")
                .longOpt("springboot")
                .desc("Camel SpringBoot version").hasArg().build();
        Option verboseOption = Option.builder().argName("v").option("v").longOpt("verbose")
                .desc("Be more verbose")
                .build();

        options.addOption(outputOption);
        options.addOption(catalogsNameOption);
        options.addOption(kameletsVersionOption);
        options.addOption(camelMainVersionOption);
        options.addOption(camelQuarkusVersionOption);
        options.addOption(camelSpringbootVersionOption);
        options.addOption(verboseOption);

        CommandLineParser parser = new DefaultParser();
        CommandLine cmd = parser.parse(options, args);
        configBean.setOutputFolder(Util.getNormalizedFolder(cmd.getOptionValue(outputOption.getOpt())));
        configBean.setCatalogsName(cmd.getOptionValue(catalogsNameOption.getOpt()));
        configBean.setKameletsVersion(cmd.getOptionValue(kameletsVersionOption.getOpt()));

        addRuntimeVersions(configBean, cmd, camelMainVersionOption, CatalogRuntime.Main);
        addRuntimeVersions(configBean, cmd, camelQuarkusVersionOption, CatalogRuntime.Quarkus);
        addRuntimeVersions(configBean, cmd, camelSpringbootVersionOption, CatalogRuntime.SpringBoot);

        if (configBean.getCatalogVersionSet().isEmpty()) {
            addDefaultVersions(configBean);
        }
    }

    public void printHelp() {
        HelpFormatter formatter = new HelpFormatter();
        formatter.printHelp("catalog-generator", this.options);
    }

    private void addRuntimeVersions(ConfigBean configBean, CommandLine cmd, Option option,
            CatalogRuntime runtime) {
        String[] versions = cmd.getOptionValues(option.getOpt());
        if (versions != null) {
            for (String version : versions) {
                configBean.addCatalogVersion(new CatalogCliArgument(runtime, version));
            }
        }
    }

    private void addDefaultVersions(ConfigBean configBean) {
        // If no version is specified, we will generate the main catalog with the
        // installed version
        LOGGER.warning(
                "\nNo Camel Main catalog version specified. \nGenerating the main catalog with the installed version");

        CamelCatalog camelCatalog = new DefaultCamelCatalog();
        configBean.addCatalogVersion(new CatalogCliArgument(CatalogRuntime.Main, camelCatalog.getCatalogVersion()));

        QuarkusRuntimeProvider quarkusRuntimeProvider = new QuarkusRuntimeProvider();
        camelCatalog.setRuntimeProvider(quarkusRuntimeProvider);
        String quarkusYamlDslVersion = camelCatalog.otherModel("yaml-dsl").getVersion();
        configBean.addCatalogVersion(new CatalogCliArgument(CatalogRuntime.Quarkus, quarkusYamlDslVersion));

        SpringBootRuntimeProvider springBootRuntimeProvider = new SpringBootRuntimeProvider();
        camelCatalog.setRuntimeProvider(springBootRuntimeProvider);
        String springbootYamlDslVersion = camelCatalog.otherModel("yaml-dsl").getVersion();
        configBean.addCatalogVersion(new CatalogCliArgument(CatalogRuntime.SpringBoot, springbootYamlDslVersion));
    }

}
