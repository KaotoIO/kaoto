package io.kaoto.companion.api;

import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.databind.exc.ValueInstantiationException;
import io.kaoto.companion.model.ExecutionResponse;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

public class JacksonExceptionMappers {

    /**
     * Quarkus REST's RequestDeserializeHandler wraps Jackson deserialization exceptions (e.g.
     * ValueInstantiationException from record compact-constructor validation) in a WebApplicationException(400) before
     * dispatching to exception mappers. We unwrap it here.
     */
    @ServerExceptionMapper
    public Response mapWebApplicationException(WebApplicationException exception) {
        Throwable cause = exception.getCause();
        while (cause != null) {
            if (cause instanceof ValueInstantiationException vie) {
                Throwable root = vie.getCause();
                String message = root != null ? root.getMessage() : vie.getOriginalMessage();
                return Response.status(400)
                        .type(MediaType.APPLICATION_JSON)
                        .entity(new ExecutionResponse("REJECTED", message))
                        .build();
            }
            if (cause instanceof JsonMappingException jme) {
                return Response.status(400)
                        .type(MediaType.APPLICATION_JSON)
                        .entity(new ExecutionResponse("REJECTED", jme.getMessage()))
                        .build();
            }
            cause = cause.getCause();
        }
        // Not a Jackson error — pass through with original status
        return Response.status(exception.getResponse().getStatus()).build();
    }

    @ServerExceptionMapper
    public Response mapValueInstantiationException(ValueInstantiationException exception) {
        Throwable cause = exception.getCause();
        String message = cause != null ? cause.getMessage() : exception.getOriginalMessage();
        return Response.status(400)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ExecutionResponse("REJECTED", message))
                .build();
    }

    @ServerExceptionMapper
    public Response mapInvalidFormatException(InvalidFormatException exception) {
        return Response.status(400)
                .type(MediaType.APPLICATION_JSON)
                .entity(new ExecutionResponse("REJECTED", exception.getMessage()))
                .build();
    }
}
