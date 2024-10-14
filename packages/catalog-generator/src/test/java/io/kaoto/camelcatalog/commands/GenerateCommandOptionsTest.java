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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.spy;

import java.io.PrintStream;
import java.nio.charset.Charset;

import org.apache.commons.cli.ParseException;
import org.apache.commons.io.output.ByteArrayOutputStream;
import org.junit.jupiter.api.Test;

import io.kaoto.camelcatalog.beans.ConfigBean;
import io.kaoto.camelcatalog.generator.Util;

public class GenerateCommandOptionsTest {
    @Test
    public void testConfigureWithAllRequiredOptions() throws ParseException {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        String[] args = { "-o", "outputDir", "-n", "catalogName", "-k", "kameletsVersion" };

        generateCommandOptions.configure(args);
        String outputDir = Util.getNormalizedFolder("outputDir");

        assertEquals(outputDir, configBean.getOutputFolder().toPath().toString());
        assertEquals("catalogName", configBean.getCatalogsName());
        assertEquals("kameletsVersion", configBean.getKameletsVersion());
    }

    @Test
    public void testConfigureWithMissingRequiredOptions() {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        String[] args = { "-o", "outputDir" };

        Exception exception = assertThrows(ParseException.class, () -> {
            generateCommandOptions.configure(args);
        });

        String expectedMessage = "Missing required option";
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    public void testConfigureWithOptionalOptions() throws ParseException {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        String[] args = { "-o", "outputDir", "-n", "catalogName", "-k", "kameletsVersion", "-m", "mainVersion", "-q",
                "quarkusVersion", "-s", "springbootVersion" };

        generateCommandOptions.configure(args);

        assertEquals("catalogName", configBean.getCatalogsName());
        assertEquals("kameletsVersion", configBean.getKameletsVersion());
        assertFalse(configBean.getCatalogVersionSet().isEmpty());
    }

    @Test
    public void testConfigureWithInvalidOptions() {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        String[] args = { "-x", "invalidOption" };

        Exception exception = assertThrows(ParseException.class, () -> {
            generateCommandOptions.configure(args);
        });

        String expectedMessage = "Unrecognized option";
        String actualMessage = exception.getMessage();
        assertTrue(actualMessage.contains(expectedMessage));
    }

    @Test
    public void testPrintHelp() {
        ConfigBean configBean = new ConfigBean();
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);

        // Redirect System.out to capture the printHelp output
        ByteArrayOutputStream outContent = new ByteArrayOutputStream();
        System.setOut(new PrintStream(outContent));

        generateCommandOptions.printHelp();

        String expectedOutput = "usage: catalog-generator";
        String actualOutput = outContent.toString(Charset.defaultCharset());
        assertTrue(actualOutput.contains(expectedOutput));

        // Reset System.out
        System.setOut(System.out);
    }

    @Test
    public void testAddDefaultVersions() throws Exception {
        ConfigBean configBean = spy(new ConfigBean());
        GenerateCommandOptions generateCommandOptions = new GenerateCommandOptions(configBean);
        String[] args = { "-o", "outputDir", "-n", "catalogName", "-k", "kameletsVersion" };

        generateCommandOptions.configure(args);

        assertTrue(configBean.getCatalogVersionSet().size() == 3);

    }
}
