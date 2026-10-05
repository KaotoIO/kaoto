package io.kaoto.kompanion.api;

import io.kaoto.kompanion.model.SubscriptionFilter;
import io.kaoto.kompanion.worker.ExecutionEventBus;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.sse.OutboundSseEvent;
import jakarta.ws.rs.sse.Sse;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Path("/v1/executions/{executionId}")
public class EventResource {

    @Inject
    ExecutionEventBus eventBus;

    /**
     * The events of the execution. Every event has an id: a client that reconnects with it in {@code Last-Event-ID} (as
     * browsers do) goes on after that event.
     *
     * <p>Without {@code kinds} nor {@code routes} the client gets every frame as the worker sent it. With either, it
     * gets the frames cut per route, of those kinds and routes only (comma separated, or repeated); its first event,
     * {@code kompanion.subscribed}, has the subscription id to change them with {@code PUT subscriptions/{id}}. With
     * {@code ensure} (trace, debug), the Kompanion keeps those features on in the app while the client is subscribed.
     */
    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    public Multi<OutboundSseEvent> events(
            @PathParam("executionId") String executionId,
            @HeaderParam("Last-Event-ID") String lastEventId,
            @QueryParam("kinds") List<String> kinds,
            @QueryParam("routes") List<String> routes,
            @QueryParam("ensure") List<String> ensure,
            @Context Sse sse) {
        Set<String> k = split(kinds);
        Set<String> r = split(routes);
        Set<String> en = split(ensure);
        ExecutionEventBus.Filter filter =
                k == null && r == null && en == null ? null : new ExecutionEventBus.Filter(k, r, en);
        Multi<ExecutionEventBus.LogEvent> events = eventBus.eventsFor(executionId, parse(lastEventId), filter);
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

    /** Changes the kinds and routes a filtered client gets: it then gets the current state of the new ones. */
    @PUT
    @Path("/subscriptions/{subscriptionId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response updateSubscription(
            @PathParam("executionId") String executionId,
            @PathParam("subscriptionId") String subscriptionId,
            SubscriptionFilter filter) {
        if (filter == null) {
            return Response.status(400).build();
        }
        boolean updated = eventBus.updateFilter(
                executionId,
                subscriptionId,
                new ExecutionEventBus.Filter(split(filter.kinds()), split(filter.routes()), split(filter.ensure())));
        return Response.status(updated ? 204 : 404).build();
    }

    /** The values of a list parameter, comma separated or repeated; null when there are none. */
    private static Set<String> split(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        Set<String> all = new LinkedHashSet<>();
        for (String v : values) {
            for (String part : v.split(",")) {
                if (!part.isBlank()) {
                    all.add(part.trim());
                }
            }
        }
        return all;
    }

    private static Long parse(String lastEventId) {
        try {
            return lastEventId == null || lastEventId.isBlank() ? null : Long.valueOf(lastEventId.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
