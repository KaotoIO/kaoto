package io.kaoto.camelcatalog;

import java.util.logging.Logger;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.commands.GenerateCommand;
import io.kaoto.camelcatalog.commands.GenerateCommandOptions;

public class Main {
    private static final Logger LOGGER = Logger.getLogger(Main.class.getName());
    static final int EXIT_CODE_SUCCESS = 0;
    static final int EXIT_CODE_FAILURE = 1;

    public static void main(String[] args) {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        int exitCode = EXIT_CODE_SUCCESS;

        try {
            generateCommandOptions.configure(args);
        } catch (Exception e) {
            LOGGER.severe("Error: " + e.getMessage());
            generateCommandOptions.printHelp();
            exitCode = EXIT_CODE_FAILURE;
        }

        GenerateCommand generateCommand = new GenerateCommand(configBean);
        generateCommand.run();

        exit(exitCode);
    }

    static void exit(int status) {
        System.exit(status);
    }
}
