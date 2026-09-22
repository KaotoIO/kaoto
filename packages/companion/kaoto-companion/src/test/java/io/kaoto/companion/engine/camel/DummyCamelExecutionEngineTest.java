package io.kaoto.companion.engine.camel;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.kaoto.companion.model.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class DummyCamelExecutionEngineTest {

    private final DummyCamelExecutionEngine engine = new DummyCamelExecutionEngine();

    @Test
    void executeLogsContextAndReturnsWithoutThrowing() {
        var context = new ExecutionContext(
                "/workspace",
                new WorkloadSpec(
                        Framework.CAMEL,
                        "camel-main:4.10.0",
                        List.of(new WorkloadSource("integrations/hello.camel.yaml", SourceFormat.CAMEL_YAML)),
                        List.of(),
                        List.of(),
                        List.of()));

        assertDoesNotThrow(() -> engine.execute(context));
    }
}
