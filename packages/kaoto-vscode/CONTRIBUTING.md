# Contributing to kaoto-vscode

For general contribution guidelines — issues, pull requests, code style, AI-assisted contributions, and the monorepo setup — see the root [CONTRIBUTING.md](../../CONTRIBUTING.md).

This file covers extension-specific development topics.

---

## Development environment

### Launch the extension locally

#### Desktop

Open the monorepo `kaoto` folder in VS Code, then run the **`Run Extension`** launch configuration from the Run and Debug panel. A new VS Code window opens with `[Extension Development Host]` in its title bar.

#### Web (browser)

> Web mode is a future plan — not fully supported yet.

```bash
yarn workspace vscode-kaoto run run:webmode
```

### Debug the webview

Use **Developer: Toggle Developer Tools** inside the Extension Development Host window to open the browser devtools for the webview. See the [official VS Code webview debugging docs](https://code.visualstudio.com/api/extension-guides/webview#inspecting-and-debugging-webviews).

### Test against the latest unreleased Kaoto UI

The extension depends on `@kaoto/kaoto` via `workspace:*`, so within the monorepo the live source is already linked. To iterate on UI changes:

1. Build the Kaoto library:
   ```bash
   yarn workspace @kaoto/kaoto build:lib
   ```
2. Then build and launch the extension as normal (`yarn workspace vscode-kaoto run build:dev` + Run Extension).

No manual `yarn link` is needed — the workspace resolution handles it.

### Run unit tests

```bash
yarn workspace vscode-kaoto test:unit
```

On Linux without a display, prefix the command with `xvfb-run -a`.

The unit-test build first checks types with `tsc --noEmit`, then bundles tests and Kaoto workspace sources with Vite. It does not require rebuilding the UI library. Vite emits CommonJS bundles into `out-unit-tests/test/`, preserving the existing test-cli and Mocha runner. The [Vite library-mode documentation](https://vite.dev/guide/build.html#library-mode) describes support for CommonJS output.

To debug tests, run the command in a VS Code terminal with Auto Attach enabled or in a JavaScript Debug Terminal. The test configuration preloads the terminal-provided debugger bootloader inside the extension host before loading tests. Mocha timeouts are disabled in this mode so you can pause at source-mapped TypeScript breakpoints.

---

## Snapshots

Snapshot VSIX binaries built from `main` are available as GitHub Actions artifacts on the [kaoto repository](https://github.com/KaotoIO/kaoto/actions).

To install a `.vsix` locally, see the [official VS Code guide](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix).
