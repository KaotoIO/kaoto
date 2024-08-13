package io.kaoto.camelcatalog;

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
            assertTrue(exitCode[0] == EXIT_CODE_SUCCESS);
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
            assertTrue(exitCode[0] == EXIT_CODE_FAILURE);
        }
    }
}
