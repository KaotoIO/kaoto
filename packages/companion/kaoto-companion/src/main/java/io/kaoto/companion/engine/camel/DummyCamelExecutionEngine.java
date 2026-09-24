package io.kaoto.companion.engine.camel;

import io.kaoto.companion.engine.ExecutionEngine;
import io.kaoto.companion.model.ExecutionContext;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DummyCamelExecutionEngine implements ExecutionEngine {

    private static final Logger LOG = Logger.getLogger(DummyCamelExecutionEngine.class);

    @Override
    public void execute(ExecutionContext context) {
        LOG.infof("DummyCamelExecutionEngine received execution context: %s", context);
    }
}
