# kaoto-e2e

Black-box end-to-end integration tests for the Kaoto Companion. Tests in this module spawn a real
companion process and interact with it exclusively through its public HTTP and WebSocket APIs — no
internal classes are imported.

## What is tested

- Companion startup handshake — reads `KAOTO_COMPANION_PORT=<port>` from stdout and verifies
  `/v1/info` returns a valid response.
- `/v1/executions` (POST) — verifies the MVP endpoint accepts a workload spec and returns `202 Accepted`.
- `/v1/worker/connect` (WebSocket) — verifies the companion accepts a raw WebSocket connection
  scoped to an execution ID.

## Key classes

| Class                                                                          | Purpose                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`CompanionE2EIT`](src/test/java/io/kaoto/e2e/CompanionE2EIT.java)             | JUnit 5 test class — all black-box scenarios                                    |
| [`CompanionProcess`](src/test/java/io/kaoto/e2e/support/CompanionProcess.java) | Launches the companion runner jar, waits for the port line, exposes `baseUrl()` |
| [`WorkloadFixtures`](src/test/java/io/kaoto/e2e/support/WorkloadFixtures.java) | Builds JSON payloads and locates fixture files used in tests                    |

## Fixture files

- [`hello-timer.camel.yaml`](src/test/resources/fixtures/hello-timer.camel.yaml) — minimal
  Camel YAML route used as a workload spec in the execution acceptance test.

## Prerequisites

The companion runner jar must be built before running these tests:

```bash
mvn clean package -pl kaoto-companion -am
```

## Run

```bash
# Runs only the integration tests (unit tests are skipped — there are none)
mvn verify -pl kaoto-e2e -am
```

The `kaoto.companion.jar` system property points to
`kaoto-companion/target/kaoto-companion-<version>-runner.jar` and is set automatically by the
Failsafe plugin configuration in [`pom.xml`](pom.xml).
