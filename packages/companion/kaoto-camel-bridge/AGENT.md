# kaoto-camel-bridge

A host-agnostic Java library that is added to a running Camel application and connects it to the
Kaoto Companion over WebSocket. It is a strict no-op when the two required system properties
(`kaoto.companion.address` and `kaoto.companion.execution-id`) are absent.

## Sub-modules

| Module           | Artifact        | Purpose                                                                          |
| ---------------- | --------------- | -------------------------------------------------------------------------------- |
| `core`           | `bridge-core`   | Main library: `KaotoCamelBridge`, protocol POJOs, WebSocket transport, SPI hooks |
| `plugin`         | `bridge-plugin` | `ContextServicePlugin` for zero-config activation on Camel ≥ 4.15                |
| `dist`           | `bridge-dist`   | Shaded uber-jar that bundles core + plugin for consumers                         |
| `it-spring-boot` | —               | Integration test — bridge on a Spring Boot Camel app                             |
| `it-quarkus`     | —               | Integration test — bridge on a Quarkus Camel app                                 |

## Key classes (core)

- [`KaotoCamelBridge`](core/src/main/java/io/kaoto/camel/bridge/KaotoCamelBridge.java) — entry
  point; implements both `CamelContextCustomizer` and `CamelConfiguration` so every activation
  path (camel-main, Spring Boot, Quarkus, plugin) converges here.
- [`WorkerWebSocketClient`](core/src/main/java/io/kaoto/camel/bridge/transport/WorkerWebSocketClient.java) —
  manages the outbound WebSocket connection to the companion.
- [`BridgeLifecycleStrategy`](core/src/main/java/io/kaoto/camel/bridge/spi/BridgeLifecycleStrategy.java) —
  dispatches incoming commands to the `CamelContext` (start/stop/suspend/resume route, inject
  exchange, stop worker).
- [`BridgeEventNotifier`](core/src/main/java/io/kaoto/camel/bridge/spi/BridgeEventNotifier.java) —
  listens for Camel management events and forwards them to the companion as JSON frames.

## Activation by runtime

| Runtime                 | How to activate                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| camel-main / Quarkus    | `camel.beans.kaotoBridge=#class:io.kaoto.camel.bridge.KaotoCamelBridge` in `application.properties` |
| Spring Boot             | Automatic — `AutoConfiguration.imports` in the jar registers the bean                               |
| Camel ≥ 4.15 (any host) | Automatic — `ContextServicePlugin` calls `configure` during context startup                         |

## Build

```bash
# From the repo root — builds all bridge sub-modules
mvn clean install -pl kaoto-camel-bridge -am
```

## Test

```bash
# Unit tests only (core)
mvn test -pl kaoto-camel-bridge/core

# All sub-modules including integration tests
mvn verify -pl kaoto-camel-bridge/it-spring-boot,kaoto-camel-bridge/it-quarkus
```
