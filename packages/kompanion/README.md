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
  -Dkaoto.companion.address=127.0.0.1:8000 \
  -Dkaoto.companion.execution-id=run-1
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

### Poll a result

If you need to check the result of a command after the fact (e.g. the ack timed out), poll by
`correlationId`:

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
data: {"type":"camel.worker.ready","executionId":"run-1","camelVersion":"4.22.0","bridgeVersion":"1.0.0-SNAPSHOT"}
data: {"type":"camel.route.started","executionId":"run-1","routeId":"route-8276","description":null}
data: {"type":"camel.telemetry.snapshot","executionId":"run-1","routes":[...]}
```

---

## Full walkthrough with demo-app-main

```bash
# Terminal 1 — companion
mvn quarkus:dev -pl kaoto-companion -Dquarkus.http.port=8000

# Terminal 2 — demo app
mvn camel:run -pl demo-apps/demo-app-main \
  -Dkaoto.companion.address=127.0.0.1:8000 \
  -Dkaoto.companion.execution-id=run-1

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
both `kaoto.companion.address` and `kaoto.companion.execution-id` are set.

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
