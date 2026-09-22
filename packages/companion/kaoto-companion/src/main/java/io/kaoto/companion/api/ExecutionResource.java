package io.kaoto.companion.api;

import io.kaoto.companion.engine.EngineDispatcher;
import io.kaoto.companion.model.ExecutionContext;
import io.kaoto.companion.model.ExecutionResponse;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

@Path("/v1")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ExecutionResource {

    private static final Logger LOG = Logger.getLogger(ExecutionResource.class);

    @Inject
    EngineDispatcher dispatcher;

    @GET
    @Path("/info")
    public InfoResponse info() {
        String version = getClass().getPackage().getImplementationVersion();
        return new InfoResponse("kaoto-companion", version != null ? version : "dev");
    }

    @POST
    @Path("/executions")
    public Response execute(ExecutionContext context) {
        if (context == null) {
            return Response.status(400)
                    .entity(new ExecutionResponse("REJECTED", "Request body must not be null"))
                    .build();
        }
        try {
            dispatcher.dispatch(context);
        } catch (Exception e) {
            LOG.error("Unexpected error during dispatch", e);
            return Response.status(500)
                    .entity(new ExecutionResponse("ERROR", e.getMessage()))
                    .build();
        }
        return Response.status(202)
                .entity(new ExecutionResponse("ACCEPTED", "Execution context received"))
                .build();
    }
}
