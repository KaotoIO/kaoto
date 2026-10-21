# @kaoto/ui-tests-vscode

[ExTester](https://github.com/redhat-developer/vscode-extension-tester) UI tests for the Kaoto VS Code extension
([`vscode-kaoto`](../kaoto-vscode)). The tests install the packaged extension (VSIX) into a test instance of VS Code and
drive its UI; they never import the extension's sources.

`package.json` declares `"vscode-kaoto": "workspace:*"`, so Yarn and Lerna see this package as a dependent of the
extension: `yarn workspaces foreach --since=<ref> -R ...` includes it whenever the extension, or the UI library the
extension embeds, changes.

## Commands

Run from the repository root.

| Task                                     | Command                                               |
| ---------------------------------------- | ----------------------------------------------------- |
| Compile the tests to `out/`              | `yarn workspace @kaoto/ui-tests-vscode build`         |
| Lint                                     | `yarn workspace @kaoto/ui-tests-vscode lint`          |
| Package the extension and run all tests  | `yarn workspace @kaoto/ui-tests-vscode test:ui`       |
| Remove downloads, compiled tests, VSIXes | `yarn workspace @kaoto/ui-tests-vscode test:ui:clean` |

`test:ui` packages the extension's current `dist/` into `vscode-kaoto.vsix` in this folder, so build the extension
first:

```bash
yarn workspace @kaoto/kaoto build:lib
yarn workspace vscode-kaoto build:prod
yarn workspace @kaoto/ui-tests-vscode test:ui
```

On Linux without a display, prefix the test command with `xvfb-run -a`. The editor, views and export groups need Java
and JBang; the deploy group needs minikube.

### Against a prebuilt VSIX

CI builds the VSIX once and runs each group in its own job. Set `VSIX_FILE` (relative to this folder, or absolute) and
use the group scripts:

```bash
export VSIX_FILE=./kaoto-ci.vsix

yarn workspace @kaoto/ui-tests-vscode test:ui:vsix            # all groups (extester.config.json globs)
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:settings   # out/settings/*.test.js
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:editor     # out/editor/*.test.js
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:views      # out/views/*.test.js
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:export     # out/export/*.test.js
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:deploy     # out/deploy/*.test.js (minikube settings)
```

CI also sets `CODE_VERSION=max` (latest VS Code that ExTester supports), `TEST_RESOURCES` (ExTester storage, uploaded
on failure) and `KAOTO_DISABLE_WHATS_NEW=true`.

## Layout

| Path                                                                  | Contents                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/settings`, `src/editor`, `src/views`, `src/export`, `src/deploy` | Test groups; CI runs each group as its own job                            |
| `src/pageObjects`                                                     | Kaoto page objects; `locators.ts` is ExTester's `customPageObjects`       |
| `src/utils`                                                           | Helpers shared by the groups                                              |
| `src/vscode-settings*.json`                                           | User settings for the VS Code test instance                               |
| `src/.mocharc.json`                                                   | Mocha `failZero`: a run that finds no tests fails                         |
| `test Fixture with speci@l chars/`                                    | Workspace the tests open; its name contains spaces and special characters |
| `extester.config.json`                                                | ExTester setup and run options                                            |

The tests locate the fixture from `__dirname` (`out/<group>/../../`), so the compiled tests must stay in `out/<group>/`.
