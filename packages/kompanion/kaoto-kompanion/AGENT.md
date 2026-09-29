# kaoto-companion

A Quarkus HTTP server that acts as the control plane between an IDE (e.g. a VS Code extension) and
one or more running Camel applications. The IDE spawns the companion on demand, connects worker
processes via WebSocket, and drives them through a REST API.

## Responsibilities

- Accepts WebSocket connections from `kaoto-camel-bridge` workers (`/v1/worker/connect`).
- Exposes a synchronous command API (`POST /v1/executions/{id}/commands`) that forwards commands
  to the connected worker and waits for an acknowledgement (up to 10 s by default).
- Streams events from the worker back to the IDE as Server-Sent Events (`GET /v1/executions/{id}/events`).
- Exposes `/v1/info` for health / version checks.
- Prints `KAOTO_COMPANION_PORT=<port>` to stdout once ready so the host process can discover the
  port when started with `quarkus.http.port=0`.

## Package layout

| Package  | Purpose                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------- |
| `api`    | JAX-RS resources (`CommandResource`, `EventResource`, `ExecutionResource`) and response DTOs       |
| `engine` | `ExecutionEngine` abstraction + `EngineDispatcher`; stub implementations for Camel and Citrus      |
| `model`  | Shared data model: `CompanionCommand`, `CompanionEvent`, `CommandResult`, `ExecutionContext`, etc. |
| `worker` | WebSocket handler (`WorkerWebSocketHandler`), per-execution event bus, worker registry             |

## Key classes

- [`WorkerWebSocketHandler`](src/main/java/io/kaoto/companion/worker/WorkerWebSocketHandler.java) —
  Quarkus `@WebSocket` endpoint; routes inbound messages to the event bus and dispatches outbound
  commands.
- [`WorkerRegistry`](src/main/java/io/kaoto/companion/worker/WorkerRegistry.java) — tracks live
  worker sessions keyed by execution ID.
- [`ExecutionEventBus`](src/main/java/io/kaoto/companion/worker/ExecutionEventBus.java) — fan-out
  event bus that delivers worker events to SSE subscribers.
- [`CommandResource`](src/main/java/io/kaoto/companion/api/CommandResource.java) — REST endpoint
  for posting and polling commands.

## Build

```bash
# JVM mode (fast iteration)
mvn clean package -pl kaoto-companion -am

# Start in dev mode
mvn quarkus:dev -pl kaoto-companion -Dquarkus.http.port=8000
```

## Test

```bash
# Unit + Quarkus integration tests
mvn test -pl kaoto-companion

# Native build and native integration tests
mvn verify -pl kaoto-companion -Pnative
```

## Runtime configuration

| Property            | Default      | Description                   |
| ------------------- | ------------ | ----------------------------- |
| `quarkus.http.port` | `0` (random) | Port the companion listens on |
| `quarkus.http.host` | `localhost`  | Bind address                  |

Pass `-Dquarkus.http.port=8000` (or `QUARKUS_HTTP_PORT=8000`) to fix the port for local
development.
