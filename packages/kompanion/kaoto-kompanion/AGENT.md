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
- [`ConnectorFrameHandler`](src/main/java/io/kaoto/kompanion/worker/ConnectorFrameHandler.java) —
  handles the `hello` / `result` / `snapshot` frames of camel-cli-connector, from either transport.
- [`ConnectorActions`](src/main/java/io/kaoto/kompanion/worker/ConnectorActions.java) — the
  connector actions of each Camel version, which ones write an output, single or multi action slot.
  Taken from the connector sources: update it when a Camel release adds actions.
- [`FileWorkerDiscovery`](src/main/java/io/kaoto/kompanion/worker/FileWorkerDiscovery.java) —
  finds the apps on the connector's file transport by their lock file `~/.camel/{pid}` and
  registers them as `pid-<pid>` (`WorkerProtocol.FILE`).
- [`FileWorker`](src/main/java/io/kaoto/kompanion/worker/FileWorker.java) — turns the files of one
  app into connector frames (snapshot files rewritten in place are re-read until they parse; trace
  and receive are tailed) and runs actions as files (written then renamed, done once the connector
  deleted them).
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
| `kaoto.kompanion.command.ack-timeout` | `10s` | Long-poll timeout of `POST .../commands` before answering 202 |
| `kaoto.kompanion.worker.protocol-timeout` | `5s` | Wait for the worker's first frame (protocol detection) before answering 503 |
| `kaoto.kompanion.worker-token` | — | Bearer token workers must send at the handshake (401 otherwise); a non-loopback `Origin` is rejected with 403 |
| `kaoto.kompanion.events.buffer` | `4096` | Frames buffered per SSE subscriber; snapshots are superseded instead of buffered |
| `kaoto.kompanion.command.result-ttl` | `10m` | How long the result of a command answered `202` can be polled once it arrived (a command answered `200` is not kept) |
| `kaoto.kompanion.command.pending-timeout` | `10m` | A command the worker does not answer for this long fails |
| `kaoto.kompanion.command.max-results` | `10000` | Commands kept for polling per execution; the oldest results go first |
| `kaoto.kompanion.file-transport.enabled` | `true` | Discover the Camel apps on the camel-cli-connector file transport (`<camel-home>/.camel`) |
| `kaoto.kompanion.file-transport.camel-home` | `user.home` | Directory holding the `.camel` directory of camel-cli-connector |
| `kaoto.kompanion.file-transport.scan-interval` / `poll-interval` | `1s` / `100ms` | How often the directory is scanned for apps / the files of each app are read |
| `kaoto.kompanion.file-transport.stale-after` | `30s` | An app whose status file is not updated for this long is dropped |
| `kaoto.kompanion.file-transport.action-timeout` | `60s` | An action file the connector has not run by then is taken back and the command fails |
| `kaoto.kompanion.file-transport.exit-timeout` | `30s` | Warn when the process still runs this long after its Camel app stopped |
| `quarkus.websockets-next.server.max-message-size` | `16777216` | Largest worker frame (the connector sends the status snapshot whole) |

Pass `-Dquarkus.http.port=8000` (or `QUARKUS_HTTP_PORT=8000`) to fix the port for local
development.
