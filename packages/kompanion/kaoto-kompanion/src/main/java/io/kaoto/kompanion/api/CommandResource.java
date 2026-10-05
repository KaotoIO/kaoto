package io.kaoto.kompanion.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.kaoto.kompanion.model.CommandResult;
import io.kaoto.kompanion.model.KompanionCommand;
import io.kaoto.kompanion.worker.ConnectorActions;
import io.kaoto.kompanion.worker.ConnectorProtocolCodec;
import io.kaoto.kompanion.worker.WorkerProtocol;
import io.kaoto.kompanion.worker.WorkerRegistry;
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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
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

    @ConfigProperty(name = "kaoto.kompanion.command.ack-timeout", defaultValue = "10s")
    Duration ackTimeout;

    @ConfigProperty(name = "kaoto.kompanion.worker.protocol-timeout", defaultValue = "5s")
    Duration protocolTimeout;

    @POST
    @Blocking
    public Response submit(@PathParam("executionId") String executionId, KompanionCommand command) {
        if (command == null) {
            return errorResponse(400, "Request body must not be null");
        }

        // Read channel snapshot once: both protocol detection and dispatch must target the same connection so
        // that a frame encoded for CONNECTOR is never sent to a BRIDGE worker (or vice versa) on reconnect.
        WorkerRegistry.ChannelSnapshot channel = registry.channelFor(executionId);
        if (channel == null) {
            return errorResponse(404, "No active execution: " + executionId);
        }

        String correlationId = UUID.randomUUID().toString();
        WorkerProtocol protocol;
        try {
            // the encoding depends on the worker protocol, known once the worker sent its first frame. The future is
            // shared by every command of the connection: wait with a per-call timeout instead of orTimeout, which
            // would complete the shared future exceptionally and fail all later commands
            protocol = channel.protocol().get(protocolTimeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            return errorResponse(503, "Worker for execution " + executionId + " has not identified itself yet");
        } catch (ExecutionException e) {
            // the worker went away between the channelFor call and here
            return errorResponse(404, "No active execution: " + executionId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return errorResponse(503, "Interrupted while waiting for the worker of execution " + executionId);
        }
        String unsupported = unsupported(executionId, protocol, command);
        if (unsupported != null) {
            return errorResponse(422, unsupported);
        }
        String jsonFrame;
        try {
            // the file transport takes the same action frames as the WebSocket one
            if (protocol != WorkerProtocol.BRIDGE) {
                jsonFrame = ConnectorProtocolCodec.encode(mapper, command, correlationId);
            } else {
                var node = mapper.valueToTree(command);
                ((com.fasterxml.jackson.databind.node.ObjectNode) node).put("correlationId", correlationId);
                jsonFrame = mapper.writeValueAsString(node);
            }
        } catch (Exception e) {
            LOG.errorf("Failed to serialize command: %s", e.getMessage());
            return errorResponse(500, "Serialization failed");
        }

        // Use the connectionId from the same snapshot to guard against a reconnect between encoding and sending.
        var future = registry.sendCommand(executionId, channel.connectionId(), correlationId, jsonFrame);

        try {
            var ack = future.orTimeout(ackTimeout.toMillis(), TimeUnit.MILLISECONDS)
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
            if (cause instanceof IllegalStateException) {
                // worker disconnected or reconnected between encoding and sending
                return errorResponse(404, "No active execution: " + executionId);
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

    /** Returns why the worker cannot run the command, or null when it can (or its Camel version is unknown). */
    private String unsupported(String executionId, WorkerProtocol protocol, KompanionCommand command) {
        if (protocol == WorkerProtocol.BRIDGE) {
            return command instanceof KompanionCommand.CmdConnectorAction
                    ? "Connector actions need a camel-cli-connector worker, execution " + executionId
                            + " uses the Kaoto bridge"
                    : null;
        }
        String camelVersion = registry.camelVersion(executionId);
        ConnectorActions actions = ConnectorActions.of(camelVersion);
        if (actions == null) {
            return null;
        }
        if (command instanceof KompanionCommand.CmdConnectorAction c) {
            String name = c.action().path("action").asText();
            return actions.supports(name) ? null : "Action '" + name + "' is not supported by Camel " + camelVersion;
        }
        if (command instanceof KompanionCommand.CmdExchangeInject c
                && c.bodyEncoding() != null
                && !actions.bodyEncoding()) {
            return "bodyEncoding is not supported by Camel " + camelVersion + " (needs 4.23 or later)";
        }
        return null;
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
