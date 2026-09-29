package io.kaoto.kompanion.engine.citrus;

import io.kaoto.kompanion.engine.ExecutionEngine;
import io.kaoto.kompanion.model.ExecutionContext;
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
