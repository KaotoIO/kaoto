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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.MockedConstruction;
import org.mockito.MockedStatic;

import io.kaoto.camelcatalog.commands.GenerateCommand;
import io.kaoto.camelcatalog.commands.GenerateCommandOptions;
import static io.kaoto.camelcatalog.Main.EXIT_CODE_SUCCESS;
import static io.kaoto.camelcatalog.Main.EXIT_CODE_FAILURE;
public class MainTest {

    @Test
    public void testMainNormalExecution() throws Exception {
        String[] args = { "-o", "outputDir", "-n", "catalogName", "-k", "kameletsVersion" };
        int[] exitCode = { 99 };

        try (
                MockedConstruction<GenerateCommandOptions> mockedGenerateCommandOptions = mockConstruction(
                        GenerateCommandOptions.class, (mock, context) -> {
                            doNothing().when(mock).configure(args);
                        });
                MockedConstruction<GenerateCommand> mockedGenerateCommand = mockConstruction(GenerateCommand.class,
                        (mock, context) -> {
                            doNothing().when(mock).run();
                        });
                MockedStatic<Main> mockedMain = mockStatic(Main.class);) {
            mockedMain.when(() -> Main.main(args)).thenCallRealMethod();
            mockedMain.when(() -> Main.exit(EXIT_CODE_SUCCESS)).then(invocation -> {
                exitCode[0] = EXIT_CODE_SUCCESS;
                return null;
            });

            Main.main(args);

            verify(mockedGenerateCommandOptions.constructed().get(0)).configure(args);
            verify(mockedGenerateCommand.constructed().get(0)).run();
            assertEquals(EXIT_CODE_SUCCESS, exitCode[0]);
        }
    }

    @Test
    public void testMainAbnormalExecution() throws Exception {
        String[] args = { "-o", "outputDir", "-n", "catalogName", "-k", "kameletsVersion" };
        int[] exitCode = { 99 };
        try (
                MockedConstruction<GenerateCommandOptions> mockedGenerateCommandOptions = mockConstruction(
                        GenerateCommandOptions.class, (mock, context) -> {
                            doThrow(new RuntimeException()).when(mock).configure(args);
                        });
                MockedConstruction<GenerateCommand> mockedGenerateCommand = mockConstruction(GenerateCommand.class,
                        (mock, context) -> {
                            doNothing().when(mock).run();
                        });
                MockedStatic<Main> mockedMain = mockStatic(Main.class);) {
            mockedMain.when(() -> Main.main(args)).thenCallRealMethod();
            mockedMain.when(() -> Main.exit(EXIT_CODE_FAILURE)).then(invocation -> {
                exitCode[0] = EXIT_CODE_FAILURE;
                return null;
            });

            Main.main(args);

            verify(mockedGenerateCommandOptions.constructed().get(0)).configure(args);
            verify(mockedGenerateCommand.constructed().get(0)).run();
            assertEquals(EXIT_CODE_FAILURE, exitCode[0]);
        }
    }
}
