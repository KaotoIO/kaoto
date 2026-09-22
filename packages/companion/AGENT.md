# Kaoto Companion — repository root

A lightweight Quarkus HTTP backend that a host process (e.g. a VS Code extension) starts on
demand. It connects to a running Camel application via the Kaoto Bridge and exposes an API to
control routes and inject exchanges.

## Architecture

```
VS Code extension / curl
        │  HTTP (REST + SSE)
        ▼
 Kaoto Companion  (Quarkus, kaoto-companion/)
        │  WebSocket
        ▼
 Camel Application  (your app + bridge-dist.jar from kaoto-camel-bridge/)
```

- The **companion** is the HTTP server the IDE talks to.
- The **bridge** is a thin jar added to the Camel application. It dials the companion over
  WebSocket and forwards commands to the running `CamelContext`.
- The **e2e** module black-box tests the companion by spawning a real process.

## Maven modules

| Directory                                            | Artifact               | Description                                                                                                  |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`kaoto-camel-bridge/`](kaoto-camel-bridge/AGENT.md) | `bridge-dist` (shaded) | Bridge library embedded in Camel apps; sub-modules: `core`, `plugin`, `dist`, `it-spring-boot`, `it-quarkus` |
| [`kaoto-companion/`](kaoto-companion/AGENT.md)       | `kaoto-companion`      | Quarkus HTTP server — the IDE-facing control plane                                                           |
| [`kaoto-e2e/`](kaoto-e2e/AGENT.md)                   | `kaoto-e2e`            | Black-box integration tests that spawn a real companion process                                              |
| `demo-apps/`                                         | —                      | Runnable demo applications used for manual testing and CI smoke tests                                        |

## Build

### Build everything

```bash
mvn clean install
```

### Build only the companion (fast iteration)

```bash
mvn clean package -pl kaoto-companion -am
```

### Build only the bridge

```bash
mvn clean install -pl kaoto-camel-bridge -am
```

## Test

### Unit tests

```bash
mvn test
```

### Unit + integration tests (all modules)

```bash
mvn verify
```

### End-to-end tests only

The e2e tests require the companion runner jar to exist first:

```bash
mvn clean package -pl kaoto-companion -am
mvn verify -pl kaoto-e2e
```

## Code style

Java source is formatted with Palantir Java Format (bridge) and Google Java Format (companion)
through Spotless.

```bash
# Check
mvn spotless:check

# Apply
mvn spotless:apply
```

A pre-commit hook enforces formatting locally — enable it once per clone:

```bash
./scripts/setup-git-hooks.sh
```

## Key configuration properties (runtime)

| Property                       | Default      | Description                                                                     |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| `quarkus.http.port`            | `0` (random) | Port the companion binds to; printed as `KAOTO_COMPANION_PORT=<port>` on stdout |
| `kaoto.companion.address`      | —            | `host:port` of the companion; set in the Camel app to activate the bridge       |
| `kaoto.companion.execution-id` | —            | Execution identifier assigned by the companion; required alongside `address`    |
