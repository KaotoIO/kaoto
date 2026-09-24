package io.kaoto.companion.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.companion.model.CommandResult;
import io.kaoto.companion.model.CompanionCommand;
import io.kaoto.companion.worker.WorkerRegistry;
import io.smallrye.common.annotation.Blocking;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeoutException;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

@Path("/v1/executions/{executionId}/commands")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CommandResource {

    private static final Logger LOG = Logger.getLogger(CommandResource.class);

    @Inject
    WorkerRegistry registry;

    @Inject
    ObjectMapper mapper;

    @ConfigProperty(name = "kaoto.companion.command.ack-timeout", defaultValue = "10s")
    Duration ackTimeout;

    @POST
    @Blocking
    public Response submit(@PathParam("executionId") String executionId, CompanionCommand command) {
        if (command == null) {
            return errorResponse(400, "Request body must not be null");
        }
        if (!registry.isConnected(executionId)) {
            return errorResponse(404, "No active execution: " + executionId);
        }

        String correlationId = UUID.randomUUID().toString();
        String jsonFrame;
        try {
            var node = mapper.valueToTree(command);
            ((com.fasterxml.jackson.databind.node.ObjectNode) node).put("correlationId", correlationId);
            jsonFrame = mapper.writeValueAsString(node);
        } catch (Exception e) {
            LOG.errorf("Failed to serialize command: %s", e.getMessage());
            return errorResponse(500, "Serialization failed");
        }

        var future = registry.sendCommand(executionId, correlationId, jsonFrame);

        try {
            var ack = future.orTimeout(ackTimeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS)
                    .join();
            return Response.ok(CommandResult.acked(correlationId, ack.success(), ack.detail()))
                    .build();
        } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof TimeoutException || e instanceof TimeoutException) {
                return Response.status(202)
                        .entity(CommandResult.pending(correlationId))
                        .build();
            }
            LOG.errorf("Command failed for execution=%s corr=%s: %s", executionId, correlationId, e.getMessage());
            return errorResponse(500, e.getMessage());
        }
    }

    @GET
    @Path("/{correlationId}")
    public Response poll(
            @PathParam("executionId") String executionId, @PathParam("correlationId") String correlationId) {
        CommandResult result = registry.getResult(executionId, correlationId);
        if (result == null) {
            throw new NotFoundException("Unknown correlationId: " + correlationId);
        }
        return Response.ok(result).build();
    }

    private Response errorResponse(int status, String message) {
        try {
            return Response.status(status)
                    .entity(mapper.writeValueAsString(Map.of("error", message)))
                    .build();
        } catch (Exception e) {
            return Response.status(status).entity("{\"error\":\"internal\"}").build();
        }
    }
}
