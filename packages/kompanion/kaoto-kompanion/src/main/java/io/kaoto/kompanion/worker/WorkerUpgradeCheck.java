package io.kaoto.kompanion.worker;

import io.quarkus.websockets.next.HttpUpgradeCheck;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Checks worker connections at the handshake, so a rejected worker sees an HTTP error (the camel-cli-connector logs it
 * and backs off) instead of a connection closed right after opening.
 */
@ApplicationScoped
public class WorkerUpgradeCheck implements HttpUpgradeCheck {

    @ConfigProperty(name = "kaoto.kompanion.worker-token")
    Optional<String> workerToken;

    @Override
    public boolean appliesTo(String endpointId) {
        return WorkerWebSocketHandler.class.getName().equals(endpointId);
    }

    @Override
    public Uni<CheckResult> perform(HttpUpgradeContext context) {
        // workers are not browsers: a web page in the developer's browser could otherwise reach this local endpoint
        if (context.httpRequest().getHeader("Origin") != null) {
            return CheckResult.rejectUpgrade(403);
        }
        if (workerToken.isPresent() && !workerToken.get().isBlank()) {
            String header = context.httpRequest().getHeader("Authorization");
            String given = header != null && header.startsWith("Bearer ") ? header.substring(7) : "";
            if (!MessageDigest.isEqual(
                    workerToken.get().getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8))) {
                return CheckResult.rejectUpgrade(401);
            }
        }
        return CheckResult.permitUpgrade();
    }
}
