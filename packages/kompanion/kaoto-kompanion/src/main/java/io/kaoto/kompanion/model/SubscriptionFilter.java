package io.kaoto.kompanion.model;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * What a filtered SSE client wants: the kinds of events and the routes (a null list means all of them), and the
 * features the Kompanion keeps on in the app while it reads.
 */
public record SubscriptionFilter(
        @Schema(description = "Kinds of events (status, trace, receive, debug, ...); null for all")
        List<String> kinds,

        @Schema(description = "Route ids; null for all (events about no route are always included)")
        List<String> routes,

        @Schema(description = "Features to keep on in the app while subscribed: trace, debug")
        List<String> ensure) {}
