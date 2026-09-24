package io.kaoto.companion;

import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;
import io.quarkus.value.registry.ValueRegistry;
import io.quarkus.vertx.http.HttpServer;
import jakarta.inject.Inject;

@QuarkusMain
public class CompanionMain implements QuarkusApplication {

    @Inject
    ValueRegistry valueRegistry;

    public static void main(String[] args) {
        Quarkus.run(CompanionMain.class, args);
    }

    @Override
    public int run(String... args) throws Exception {
        // No race: QuarkusApplication.run() is invoked after the HTTP server is fully
        // bound, so ValueRegistry already holds the actual OS-assigned port even when
        // quarkus.http.port=0 (random). The value here is never the unresolved "0"
        // sentinel; it is the real ephemeral port chosen by the OS.
        Integer port = valueRegistry.getOrDefault(HttpServer.HTTP_PORT, -1);
        if (port <= 0) {
            port = valueRegistry.getOrDefault(HttpServer.HTTP_TEST_PORT, -1);
        }
        if (port <= 0) {
            System.err.println("WARNING: could not resolve HTTP port from ValueRegistry"
                    + " (HTTP_PORT=" + valueRegistry.getOrDefault(HttpServer.HTTP_PORT, -1)
                    + ", HTTP_TEST_PORT=" + valueRegistry.getOrDefault(HttpServer.HTTP_TEST_PORT, -1) + ")");
        }
        System.out.println("KAOTO_COMPANION_PORT=" + port);
        System.out.flush();
        Quarkus.waitForExit();
        return 0;
    }
}
