package io.kaoto.companion.engine.citrus;

import io.kaoto.companion.engine.ExecutionEngine;
import io.kaoto.companion.model.ExecutionContext;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DummyCitrusExecutionEngine implements ExecutionEngine {

    private static final Logger LOG = Logger.getLogger(DummyCitrusExecutionEngine.class);

    @Override
    public void execute(ExecutionContext context) {
        LOG.infof("DummyCitrusExecutionEngine received execution context: %s", context);
    }
}
