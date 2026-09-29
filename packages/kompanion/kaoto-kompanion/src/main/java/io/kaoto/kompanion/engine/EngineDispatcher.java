package io.kaoto.kompanion.engine;

import io.kaoto.kompanion.engine.camel.DummyCamelExecutionEngine;
import io.kaoto.kompanion.engine.citrus.DummyCitrusExecutionEngine;
import io.kaoto.kompanion.model.ExecutionContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class EngineDispatcher {

    private final DummyCamelExecutionEngine camelEngine;
    private final DummyCitrusExecutionEngine citrusEngine;

    @Inject
    public EngineDispatcher(DummyCamelExecutionEngine camelEngine, DummyCitrusExecutionEngine citrusEngine) {
        this.camelEngine = camelEngine;
        this.citrusEngine = citrusEngine;
    }

    public void dispatch(ExecutionContext context) {
        ExecutionEngine engine =
                switch (context.workload().framework()) {
                    case CAMEL -> camelEngine;
                    case CITRUS -> citrusEngine;
                };
        engine.execute(context);
    }
}
