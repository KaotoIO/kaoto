package io.kaoto.companion.engine;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import io.kaoto.companion.engine.camel.DummyCamelExecutionEngine;
import io.kaoto.companion.engine.citrus.DummyCitrusExecutionEngine;
import io.kaoto.companion.model.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class EngineDispatcherTest {

    private final EngineDispatcher dispatcher =
            new EngineDispatcher(new DummyCamelExecutionEngine(), new DummyCitrusExecutionEngine());

    @Test
    void dispatchesToCamelEngineForCamelFramework() {
        var context = new ExecutionContext(
                "/workspace",
                new WorkloadSpec(
                        Framework.CAMEL,
                        "camel-main:4.10.0",
                        List.of(new WorkloadSource("hello.camel.yaml", SourceFormat.CAMEL_YAML)),
                        List.of(),
                        List.of(),
                        List.of()));

        assertDoesNotThrow(() -> dispatcher.dispatch(context));
    }

    @Test
    void dispatchesToCitrusEngineForCitrusFramework() {
        var context = new ExecutionContext(
                "/workspace",
                new WorkloadSpec(
                        Framework.CITRUS,
                        "citrus:4.10.3",
                        List.of(new WorkloadSource("tests/hello.yaml", SourceFormat.CITRUS_YAML)),
                        List.of(),
                        List.of(),
                        List.of()));

        assertDoesNotThrow(() -> dispatcher.dispatch(context));
    }
}
