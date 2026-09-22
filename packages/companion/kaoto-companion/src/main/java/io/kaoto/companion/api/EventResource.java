package io.kaoto.companion.api;

import io.kaoto.companion.worker.ExecutionEventBus;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestStreamElementType;

@Path("/v1/executions/{executionId}")
public class EventResource {

    @Inject
    ExecutionEventBus eventBus;

    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<String> events(@PathParam("executionId") String executionId) {
        Multi<String> stream = eventBus.streamFor(executionId);
        if (stream == null) {
            throw new NotFoundException("No active execution: " + executionId);
        }
        return stream;
    }
}
