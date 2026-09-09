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

---

## Snapshots

Snapshot VSIX binaries built from `main` are available as GitHub Actions artifacts on the [kaoto repository](https://github.com/KaotoIO/kaoto/actions).

To install a `.vsix` locally, see the [official VS Code guide](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix).
