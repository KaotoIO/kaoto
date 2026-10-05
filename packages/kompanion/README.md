# Kaoto Companion

A lightweight Quarkus HTTP backend that a host process (e.g. a VS Code extension) starts on demand,
connects to a running Camel application via the Kaoto Bridge, and exposes an API to control routes
and inject exchanges.

## Architecture overview

```
VS Code extension / curl
        │  HTTP (REST + SSE)
        ▼
 Kaoto Companion  (this repo, Quarkus)
        │  WebSocket
        ▼
 Camel Application  (your app + kaoto-camel-bridge-dist.jar)
```

- The **companion** is the HTTP server the IDE talks to.
- The **bridge** is a small jar you add to your Camel application. It dials the companion over WebSocket and forwards commands to the running `CamelContext`.
- The companion is stateless with respect to Camel — it passes commands through and streams events back verbatim.

---

## Quick start

### 1 — Build everything

```bash
mvn clean install
```

This builds the companion, the bridge, and the demo applications.

### 2 — Start the companion

```bash
mvn quarkus:dev -pl kaoto-companion -Dquarkus.http.port=8000
```

The companion is now listening at `http://localhost:8000`. Confirm it is up:

```bash
curl -s http://localhost:8000/v1/info | jq
```

### 3 — Start the demo app with the bridge connected

`demo-app-main` is a camel-main application with a single route (`route-8276`) that reads from
`direct:incoming` and logs the message. The route starts with `autoStartup: false` so you can
exercise the start/stop commands.

Build the demo app:

```bash
mvn clean install -pl demo-apps/demo-app-main
```

Run it with the bridge pointing at the companion:

```bash
mvn camel:run -pl demo-apps/demo-app-main \
  -Dkaoto.kompanion.address=127.0.0.1:8000 \
  -Dkaoto.kompanion.execution-id=run-1
```

When the bridge connects you will see in the companion logs:

```
Worker connected: execution=run-1 remote=127.0.0.1:...
```

And in the demo app logs:

```
Connected to Kaoto companion (execution: run-1)
```

---

## Camel apps on the camel-cli-connector file transport

A Camel app with `camel-cli-connector` on its classpath (Camel Main), `camel-cli-connector-starter`
(Spring Boot) or `camel-quarkus-cli-connector` (Quarkus) writes its state to `~/.camel/{pid}-*.json`
and reads actions from files there: that is the connector's default transport, the one the `camel`
CLI uses, in every Camel release. The Kompanion finds these apps on its own and manages them as
execution `pid-<pid>`, without launching them and without any change to the app.

- Turn it off with `kaoto.kompanion.file-transport.enabled=false`; point it at another home with
  `kaoto.kompanion.file-transport.camel-home` (the directory that holds `.camel`, `user.home` by
  default, as Camel).
- Same host and same user as the app only.
- Polling: the connector reads actions and writes snapshots every second, so a command takes about
  a second, and debug/history snapshots about two.
- The connector only logs failures. The Kompanion infers the result: from the action output (e.g.
  the `status` of `send`), from the route state in the next status for route commands, and an
  unknown route is refused before writing anything. Actions without output (`reset-stats`,
  `logger`, ...) are reported done once the connector ran them.
- Before 4.21 an app has a single action slot, shared with the `camel` CLI: the Kompanion sends one
  action at a time and answers `Busy` when a CLI command holds the slot; a CLI command run at the
  same time can take the output of a Kompanion action (the action then fails).
- `camel.cmd.worker.stop` deletes the lock file, which makes the connector stop Camel. On Camel
  Main 4.18.x the JVM does not exit afterwards (fixed in 4.19 by CAMEL-23230); the Kompanion logs a
  warning when the process outlives `kaoto.kompanion.file-transport.exit-timeout`.
- Files left by a killed app are skipped, never deleted.

## Commands API

All commands are sent as a `POST` to:

```
POST http://localhost:8000/v1/executions/{executionId}/commands
Content-Type: application/json
```

The companion responds synchronously (up to 10 s by default) and returns:

```json
{ "correlationId": "<uuid>", "status": "acked", "success": true, "detail": null }
```

`status` is `"acked"` when the bridge confirmed execution, `"timeout"` when no ack arrived in
time, or `"pending"` when polled before the ack.

### Available commands

#### Start a route

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.start","routeId":"route-8276"}'
```

#### Stop a route

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.stop","routeId":"route-8276"}'
```

#### Suspend a route

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.suspend","routeId":"route-8276"}'
```

#### Resume a route

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.resume","routeId":"route-8276"}'
```

#### Stop the worker (shuts down the Camel application)

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.worker.stop"}'
```

#### Inject an exchange — plain text / JSON body

Sends a message directly to a Camel endpoint. The route must be running first.

```bash
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type":     "camel.cmd.exchange.inject",
    "endpoint": "direct:incoming",
    "headers":  { "Content-Type": "application/json" },
    "body":     "{\"hello\": \"world\"}"
  }'
```

#### Inject an exchange — binary file (base64)

Encode the file to base64 first, then pass it in `body` with `"bodyEncoding":"base64"`. Using a
temp file avoids shell quoting issues with large payloads:

```bash
# 1. Build the JSON payload
jq -n --arg body "$(base64 -w0 /path/to/file.pdf)" \
  '{
    "type":         "camel.cmd.exchange.inject",
    "endpoint":     "direct:incoming",
    "headers":      {"Content-Type": "application/pdf"},
    "body":         $body,
    "bodyEncoding": "base64"
  }' > /tmp/inject.json

# 2. Send it
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d @/tmp/inject.json
```

> On macOS replace `base64 -w0` with `base64 -i`.

#### Run a camel-cli-connector action

Only for Camel apps managed through camel-cli-connector (file or WebSocket transport). The `action`
object is sent to the connector as it is; an action the app's Camel version does not have is
answered `422`.

```bash
curl -s -X POST http://localhost:8000/v1/executions/pid-12345/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.connector.action","action":{"action":"trace","enabled":"true"}}'
```

### Poll a result

When the ack did not arrive in time (`202`), poll the result by `correlationId`. Only those
commands are kept: their result can be polled for `kaoto.kompanion.command.result-ttl` (10 minutes)
after it arrived, and a command without an answer for `kaoto.kompanion.command.pending-timeout`
fails. An expired or unknown `correlationId` answers `404`. A command answered `200` already carried
its result and is not kept.

```bash
curl -s http://localhost:8000/v1/executions/run-1/commands/<correlationId>
```

### Stream events (SSE)

Subscribe to the live event stream from a connected worker:

```bash
curl -N http://localhost:8000/v1/executions/run-1/events
```

Events are newline-delimited JSON frames forwarded verbatim from the bridge, for example:

```
data: {"type":"camel.worker.ready","executionId":"run-1","camelVersion":"4.22.0","bridgeVersion":"1.0.0-SNAPSHOT","connectorProtocol":null}
data: {"type":"camel.route.started","executionId":"run-1","routeId":"route-8276","description":null}
data: {"type":"camel.telemetry.snapshot","executionId":"run-1","routes":[...]}
```

The `camel.worker.ready` frame is replayed to clients that subscribe after the worker connected.
`bridgeVersion` is set for the Kaoto bridge and `connectorProtocol` for a camel-cli-connector
worker (see below); the other one is `null`.

For a camel-cli-connector worker, the companion translates `hello` to `camel.worker.ready` and the
`status` snapshot to `camel.telemetry.snapshot`, and additionally publishes every connector frame
raw as `camel.connector.<type>` (for example `camel.connector.snapshot`, `camel.connector.result`),
so clients can use the richer connector data:

```
data: {"type":"camel.worker.ready","executionId":"run-1","camelVersion":"4.23.0","bridgeVersion":null,"connectorProtocol":"camel-cli-connector/v1"}
data: {"type":"camel.connector.snapshot","executionId":"run-1","v":1,"kind":"status","data":{...}}
```

Each subscriber has its own bounded buffer (`kaoto.kompanion.events.buffer` frames). Snapshots
(`camel.telemetry.snapshot`, `camel.connector.snapshot`) are not buffered: a subscriber that cannot
keep up receives only the latest one.

---

## Full walkthrough with demo-app-main

```bash
# Terminal 1 — companion
mvn quarkus:dev -pl kaoto-companion -Dquarkus.http.port=8000

# Terminal 2 — demo app
mvn camel:run -pl demo-apps/demo-app-main \
  -Dkaoto.kompanion.address=127.0.0.1:8000 \
  -Dkaoto.kompanion.execution-id=run-1

# Terminal 3 — send commands
# Start the route (it starts with autoStartup: false)
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.start","routeId":"route-8276"}' | jq

# Inject a message — the demo route logs it
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type":     "camel.cmd.exchange.inject",
    "endpoint": "direct:incoming",
    "headers":  {},
    "body":     "hello from curl"
  }' | jq

# Stop the route
curl -s -X POST http://localhost:8000/v1/executions/run-1/commands \
  -H "Content-Type: application/json" \
  -d '{"type":"camel.cmd.route.stop","routeId":"route-8276"}' | jq
```

---

## Installing the bridge in your own application

The bridge is a single jar with no Spring, Quarkus, or camel-main dependency. It is a no-op unless
both `kaoto.kompanion.address` and `kaoto.kompanion.execution-id` are set.

| Host                        | Activate                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| **camel-main**              | Add `camel.beans.kaotoBridge=#class:io.kaoto.camel.bridge.KaotoCamelBridge` in `application.properties` |
| **Spring Boot**             | Nothing — `AutoConfiguration.imports` in the jar activates it automatically                             |
| **Quarkus**                 | Add `camel.beans.kaotoBridge=#class:io.kaoto.camel.bridge.KaotoCamelBridge` in `application.properties` |
| **Camel ≥ 4.18 (any host)** | Nothing — `ContextServicePlugin` in the jar activates it automatically                                  |

Maven dependency:

```xml
<dependency>
  <groupId>io.kaoto</groupId>
  <artifactId>bridge-dist</artifactId>
  <version>1.0.0-SNAPSHOT</version>
</dependency>
```

Supported Camel range: **4.10.x and newer** (community and Red Hat build). CI verifies 4.10, 4.14,
and 4.18.

Bridge system properties:

| Property                       | Description                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `kaoto.kompanion.address`      | `host:port` of the companion; activates the bridge together with `execution-id`                     |
| `kaoto.kompanion.execution-id` | Execution identifier assigned by the companion                                                      |
| `kaoto.kompanion.token`        | Bearer token sent at the handshake; required when the companion sets `kaoto.kompanion.worker-token` |

---

## Connecting a camel-cli-connector application

Camel 4.23 and newer applications that use `camel-cli-connector` can connect over its WebSocket
transport instead of the bridge, with no Kaoto jar in the application. Set in the Camel app (with
the companion started on port 8000 as in the quick start; otherwise use the port it printed as
`KAOTO_COMPANION_PORT`):

```properties
camel.cli.transport=websocket
camel.cli.websocket.url=ws://127.0.0.1:8000/v1/worker/connect?executionId=run-1
# only when the companion is started with kaoto.kompanion.worker-token
camel.cli.websocket.token=<token>
```

The companion detects the protocol from the first frame of each worker connection, so bridge and
connector workers can be mixed. Commands are translated to connector actions (`correlationId` is
sent as `requestId`) and the connector's `result` frame becomes the command ack. Commands posted
before the worker sent its first frame wait up to `kaoto.kompanion.worker.protocol-timeout` and
then answer `503`.

---

## Companion configuration

| Property                                          | Default    | Description                                                                                                   |
| ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `quarkus.http.port`                               | `0`        | Port the companion binds to; printed as `KAOTO_COMPANION_PORT=<port>` on stdout                               |
| `kaoto.kompanion.command.ack-timeout`             | `10s`      | How long `POST .../commands` waits for the ack before answering `202 pending`                                 |
| `kaoto.kompanion.worker.protocol-timeout`         | `5s`       | How long a command waits for the worker's first frame (protocol detection) before answering `503`             |
| `kaoto.kompanion.worker-token`                    | —          | When set, workers must send `Authorization: Bearer <token>` at the handshake or are rejected with `401`       |
| `kaoto.kompanion.events.buffer`                   | `4096`     | Frames buffered per SSE subscriber before its stream is failed (snapshots are superseded instead of buffered) |
| `quarkus.websockets-next.server.max-message-size` | `16777216` | Largest worker frame accepted (the connector sends the status snapshot whole, about 3 MB for 300 routes)      |

The worker endpoint also rejects a handshake with a non-loopback `Origin` header with `403`: a web
page in the developer's browser could otherwise reach the local companion. Workers that send their
own loopback `Origin` (for example Vert.x clients on Camel Quarkus) are accepted.

---

## Running the tests

```bash
mvn test
```

---

## Code style

Java source files are formatted with Palantir Java Format (bridge) and Google Java Format
(companion) through Spotless.

Check formatting:

```bash
mvn spotless:check
```

Apply formatting:

```bash
mvn spotless:apply
```

Enable the pre-commit hook once per clone to catch violations before they reach CI:

```bash
./scripts/setup-git-hooks.sh
```

---

## How the companion is started by the IDE

1. The host spawns `java -jar kaoto-companion-<version>-runner.jar`.
2. Once ready, the companion prints one line to stdout:
   ```
   KAOTO_COMPANION_PORT=<port>
   ```
3. The host reads the port and connects over HTTP on `127.0.0.1:<port>`.
4. When the host exits, it terminates the process.

The port defaults to a random OS-assigned port (`quarkus.http.port=0`). Override with
`-Dquarkus.http.port=8000` or `QUARKUS_HTTP_PORT=8000` for local development.
