package io.kaoto.kompanion.api;

import io.kaoto.kompanion.worker.ExecutionEventBus;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;

@Path("/v1/executions/{executionId}")
public class EventResource {

    @Inject
    ExecutionEventBus eventBus;

    /**
     * The events of the execution. Every event has an id: a client that reconnects with it in {@code Last-Event-ID} (as
     * browsers do) goes on after that event.
     */
    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public Multi<OutboundSseEvent> events(
            @PathParam("executionId") String executionId,
            @HeaderParam("Last-Event-ID") String lastEventId,
            @Context Sse sse) {
        Multi<ExecutionEventBus.LogEvent> events = eventBus.eventsFor(executionId, parse(lastEventId));
        if (events == null) {
            throw new NotFoundException("No active execution: " + executionId);
        }
        return events.map(e -> sse.newEventBuilder()
                .id(Long.toString(e.seq()))
                // the frame is JSON already: written as it is
                .mediaType(MediaType.TEXT_PLAIN_TYPE)
                .data(String.class, e.json())
                .build());
    }

    private static Long parse(String lastEventId) {
        try {
            return lastEventId == null || lastEventId.isBlank() ? null : Long.valueOf(lastEventId.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
