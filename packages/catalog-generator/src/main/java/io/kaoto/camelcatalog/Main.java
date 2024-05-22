package io.kaoto.camelcatalog;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.commands.GenerateCommand;
import io.kaoto.camelcatalog.commands.GenerateCommandOptions;

public class Main {
        public static void main(String[] args) {
                ConfigBean configBean = GenerateCommandOptions.configure(args);
                GenerateCommand generateCommand = new GenerateCommand(configBean);
                generateCommand.run();
        }
}
