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
| `quarkus.http.port`            | `0` (random) | Port the companion binds to; printed as `KAOTO_KOMPANION_PORT=<port>` on stdout |
| `kaoto.companion.address`      | —            | `host:port` of the companion; set in the Camel app to activate the bridge       |
| `kaoto.companion.execution-id` | —            | Execution identifier assigned by the companion; required alongside `address`    |
| `kaoto.kompanion.token`        | —            | Bearer token the bridge sends at the handshake when the companion requires one  |
| `kaoto.kompanion.worker-token` | —            | When set, the companion rejects workers without this bearer token (401)         |
| `kaoto.kompanion.worker.protocol-timeout` | `5s` | How long a command waits for the worker's first frame before answering 503   |
| `kaoto.kompanion.events.buffer` / `events.buffer-bytes` | `4096` / `32 MB` | Events kept per execution for the SSE clients (results, trace, ...); each client reads at its own pace, gets only the latest value of a state (status, debug, ...), a `kompanion.gap` event when it fell behind the kept events, and resumes with `Last-Event-ID` |
| `kaoto.kompanion.events.slice-ignore-fields` | — | Fields left out when telling whether a slice of a connector snapshot changed (e.g. `uptime`), for the SSE clients that filter |
| `kaoto.kompanion.demand.release-delay` | `0s` | How long a feature turned on for SSE clients (`ensure=trace,debug`) stays on after the last one is gone |
| `kaoto.kompanion.command.result-ttl` | `10m` | How long the result of a command answered `202` can be polled once it arrived (a command answered `200` is not kept) |
| `kaoto.kompanion.command.pending-timeout` | `10m` | A command the worker does not answer for this long fails |
| `kaoto.kompanion.command.max-results` | `10000` | Commands kept for polling per execution; the oldest results go first |
| `kaoto.kompanion.file-transport.enabled` | `true` | Discover the Camel apps on the camel-cli-connector file transport (`<camel-home>/.camel`) |
| `kaoto.kompanion.file-transport.camel-home` | `user.home` | Directory holding the `.camel` directory of camel-cli-connector |
| `kaoto.kompanion.file-transport.scan-interval` / `poll-interval` | `1s` / `100ms` | How often the directory is scanned for apps / the files of each app are read |
| `kaoto.kompanion.file-transport.stale-after` | `30s` | An app whose status file is not updated for this long is dropped |
| `kaoto.kompanion.file-transport.action-timeout` | `60s` | An action file the connector has not run by then is taken back and the command fails |
| `kaoto.kompanion.file-transport.exit-timeout` | `30s` | Warn when the process still runs this long after its Camel app stopped |
