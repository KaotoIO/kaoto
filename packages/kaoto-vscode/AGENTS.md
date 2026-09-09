# kaoto-vscode — Agent Instructions

This package is the VS Code extension for Kaoto: a visual low-code editor for Apache Camel integrations. It integrates the Kaoto UI into VS Code and provides tooling for creating, editing, and managing Camel routes, pipes, and kamelets.

**All monorepo-level rules — git workflow, PR lifecycle, guardrails, code style, and the Definition of Done — are in the root [`AGENTS.md`](../../AGENTS.md). Read it first.**

Extension-specific contribution guidance (development launch, debug, release process, conventional commits) is in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Commands

All commands run from `packages/kaoto-vscode/` unless stated otherwise.

| Task                         | Command                |
| ---------------------------- | ---------------------- |
| Compile TypeScript + webpack | `yarn run compile`     |
| Watch mode (dev)             | `yarn run watch`       |
| Production build             | `yarn run build:prod`  |
| Development build            | `yarn run build:dev`   |
| Lint                         | `yarn run lint`        |
| Unit tests                   | `yarn run test:unit`   |
| UI/integration tests         | `yarn run test:ui`     |
| Build VSIX package           | `yarn run build:vsix`  |
| Web mode (browser env)       | `yarn run run:webmode` |

### Definition of Done for this package

Before declaring a change complete:

```bash
yarn run build:dev      # compile + webpack
yarn run lint           # lint TypeScript in src/ (incl. src/ui-test)
yarn run test:unit      # unit tests via VS Code test framework
```

For significant changes, also smoke-test the VSIX:

```bash
# Full UI test run — extest packages the VSIX itself, sets up VS Code, and runs all tests
yarn run test:ui

# Headless (CI / no display)
xvfb-run -a yarn run test:ui
```

To run against a prebuilt VSIX, set `VSIX_FILE` and use the group scripts:

```bash
export VSIX_FILE=./vscode-kaoto-<version>.vsix

yarn run test:ui:vsix                  # all tests (reads extester.config.json globs)
yarn run test:ui:vsix:settings         # out/settings/*.test.js
yarn run test:ui:vsix:editor           # out/editor/*.test.js
yarn run test:ui:vsix:views            # out/views/*.test.js
yarn run test:ui:vsix:export           # out/export/*.test.js
yarn run test:ui:vsix:deploy           # out/deploy/*.test.js  (uses minikube settings)
```

The full test file globs are defined in [`extester.config.json`](./extester.config.json).

---

## Architecture

### Entry points

| File                                    | Purpose                                     |
| --------------------------------------- | ------------------------------------------- |
| `src/extension/extension.ts`            | Main extension activation (desktop VS Code) |
| `src/extension/extensionWeb.ts`         | Web extension entry point                   |
| `src/webview/KaotoEditorEnvelopeApp.ts` | Webview editor application                  |

### Source layout

- **`src/commands/`** — VS Code commands for creating Camel files and projects
- **`src/constants/`** — Domain-grouped constants (commands, settings, views, patterns, …)
- **`src/executors/`** — Executor implementations (JBang, Camel Launcher) and helpers
- **`src/extension/`** — Extension lifecycle: activation, output channel, What's New panel, and domain registrars:
  - `registrars/EditorRegistrar.ts` — toggle source code, open with Kaoto, undo/redo
  - `registrars/ExecutorRegistrar.ts` — executor setup, JBang/Java path checks, trusted sources
  - `registrars/LifecycleRegistrar.ts` — What's New panel, recommended extensions
  - `registrars/IntegrationsRegistrar.ts` — integrations view, run/project/Kubernetes/Maven commands
  - `registrars/DeploymentsRegistrar.ts` — deployments view, route stop/start/resume/suspend commands
  - `registrars/TestsRegistrar.ts` — tests view, run and init commands
  - `registrars/InfrastructureRegistrar.ts` — infrastructure view, start/stop/logs/copy commands
  - `registrars/OpenApiRegistrar.ts` — OpenAPI view and import command
  - `registrars/TrackingEvent.ts` — shared `sendCommandTrackingEvent` helper
- **`src/services/`** — Stateful domain services: `ApicurioRegistryService`, `CamelLauncherDownloader`, `KaotoCatalogService`, `OpenApiImportService`, `RedHatMavenNotificationService`, `ApplicationPropertiesFinder`, `KameletFileReader`, `MavenRuntimeDetector`, `PortManager`, `StepsOnSaveManager`, `SuggestionRegistry`, `TestFolderResolver`
- **`src/tasks/`** — Camel task definitions for the VS Code task system
- **`src/types/`** — Shared TypeScript types and enums
- **`src/utils/`** — Pure, stateless helpers (no domain logic): `ArgumentConflictDetector`, `ClasspathRootFinder`, `DockerErrorDetector`, `Modals`, `Path`, `Process`, `Version`, `Vscode`
- **`src/views/`** — Tree view providers by domain: `deployments/`, `help/`, `infrastructure/`, `integrations/`, `openapi/`, `shared/`, `tests/`
- **`src/webview/`** — Webview integration with the Kaoto editor envelope

### Test layout

- **`src/test/`** — Unit tests (mirrors source structure): `commands/`, `executors/`, `extension/`, `services/`, `utils/`, `views/`, `webview/`
- **`src/ui-test/`** — UI/integration tests: `editor/`, `pageObjects/`, `settings/`, `utils/`, `views/`

### Build

- Multi-target webpack: Web worker + Web UI → `dist/`
- TypeScript with SASS/CSS support for webview components
- Config: `eslint.config.mjs`, `.vscode-test.mjs`

---

## Supported file types

| Pattern                                                                                             | Type         |
| --------------------------------------------------------------------------------------------------- | ------------ |
| `*.camel.yaml`, `*.camel.yml`, `*.camel.xml`                                                        | Camel routes |
| `*.kamelet.yaml`, `*.kamelet.yml`                                                                   | Kamelets     |
| `*.pipe.yaml`, `*.pipe.yml`, `*-pipe.yaml`, `*-pipe.yml`                                            | Pipes        |
| `*.citrus.yaml`, `*.citrus.test.yaml`, `*.citrus.it.yaml`, `*.citrus-test.yaml`, `*.citrus-it.yaml` | Citrus tests |

---

## Key dependencies

| Dependency                       | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `@kaoto/kaoto`                   | Main Kaoto editor library                         |
| `@kie-tools-core/*`              | Editor envelope and backend (VS Code integration) |
| PatternFly React                 | UI components                                     |
| Camel JBang / Camel Launcher CLI | Running and deploying integrations                |
