package io.kaoto.companion.engine.citrus;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.kaoto.companion.model.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class DummyCitrusExecutionEngineTest {

    private final DummyCitrusExecutionEngine engine = new DummyCitrusExecutionEngine();

    @Test
    void executeLogsContextAndReturnsWithoutThrowing() {
        var context = new ExecutionContext(
                "/workspace",
                new WorkloadSpec(
                        Framework.CITRUS,
                        "citrus:4.10.3",
                        List.of(new WorkloadSource("tests/hello.yaml", SourceFormat.CITRUS_YAML)),
                        List.of(),
                        List.of(),
                        List.of()));

        assertDoesNotThrow(() -> engine.execute(context));
    }
}
