package io.kaoto.kompanion.model;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** What a filtered SSE client wants: the kinds of events and the routes. A null list means all of them. */
public record SubscriptionFilter(
        @Schema(description = "Kinds of events (status, trace, receive, debug, ...); null for all")
        List<String> kinds,

        @Schema(description = "Route ids; null for all (events about no route are always included)")
        List<String> routes) {}
