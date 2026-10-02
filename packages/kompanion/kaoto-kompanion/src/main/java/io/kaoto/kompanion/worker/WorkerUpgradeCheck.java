package io.kaoto.kompanion.worker;

import io.quarkus.websockets.next.HttpUpgradeCheck;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
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
        // a web page in the developer's browser could reach this local endpoint: refuse a remote Origin. Some worker
        // clients (Vert.x) send their own loopback origin, which is accepted
        String origin = context.httpRequest().getHeader("Origin");
        if (origin != null && !isLoopback(origin)) {
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

    static boolean isLoopback(String origin) {
        try {
            String host = URI.create(origin).getHost();
            if (host == null) {
                return false;
            }
            host = host.toLowerCase(Locale.ROOT);
            return "localhost".equals(host) || host.matches("127(\\.\\d{1,3}){3}") || "[::1]".equals(host);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
