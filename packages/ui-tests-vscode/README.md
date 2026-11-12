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

### Test groups in CI

CI runs the groups listed in the `ciTestGroups` field of `package.json`, each in a job of its own with its
`test:ui:vsix:<group>` script, on Windows for pull requests and on Linux, macOS and Windows in the nightly and release
runs.

- `all` lists every group. The nightly and release runs get all of them, and so does a pull request that changes the
  extension or these tests.
- `smoke` lists the groups for a pull request that affects the extension only through a package it embeds, such as the
  UI library or forms.
- `linuxOnly` lists the groups that run on Linux only; deploy is one, because it needs minikube.

To add a group, add its folder under `src/`, a `test:ui:vsix:<group>` script, its glob in `extester.config.json` so that
`test:ui:vsix` runs it too, and its name in `ciTestGroups.all`. **CI does not run a group that is missing from
`ciTestGroups.all`.** Add it to `ciTestGroups.smoke` only if changes to the UI library or forms should run it as well.

## Linux/Wayland troubleshooting

On Fedora/GNOME Wayland, command palette or file-picker input can stall while a `wl-clipboard` taskbar entry appears;
clicking that window may let the test continue. ExTester's `Input.setText()` reads the clipboard synchronously before
typing and can also paste from it as a fallback. Its `clipboardy` dependency selects Wayland when `WAYLAND_DISPLAY`
is set **or** `XDG_SESSION_TYPE=wayland`, invoking `wl-paste` and `wl-copy`. The
[wl-clipboard manual](https://man.archlinux.org/man/wl-clipboard.1.en#BUGS) describes a temporary transparent surface
that can hang clipboard access when the compositor does not give it focus.

To use the X11 clipboard backend for the test process, keep `DISPLAY` pointing to a working X11/XWayland display,
remove `WAYLAND_DISPLAY`, and override `XDG_SESSION_TYPE`. Run from `packages/ui-tests-vscode` after preparing a VSIX
as described above:

```bash
# Compile the tests, download VS Code/ChromeDriver, and install the chosen VSIX.
VSIX_FILE=./kaoto-ci.vsix yarn setup:test:ui:vsix

# Run the editor group using the existing X11/XWayland display.
env -u ELECTRON_RUN_AS_NODE -u WAYLAND_DISPLAY \
  XDG_SESSION_TYPE=x11 KAOTO_DISABLE_WHATS_NEW=true \
  yarn exec extest run-tests 'out/editor/*.test.js'
```

Use your actual VSIX path in the setup command. Java and JBang are still required for the editor group. Both Wayland
detection variables must be handled; clearing only one can leave the Wayland clipboard backend selected. The installed
`clipboardy` includes an `xsel` fallback for X11 clipboard access. These environment changes apply only to the child
process and leave the desktop session unchanged. XWayland still uses the real desktop clipboard, so this is not
clipboard isolation.

If launching tests from an IDE fails with `Chrome instance exited`, check whether it inherited
`ELECTRON_RUN_AS_NODE=1`. Unsetting it, as above, resolved that separate startup failure in the observed environment.

For a separate virtual display, use the `xvfb-run -a` workflow with `WAYLAND_DISPLAY` removed and
`XDG_SESSION_TYPE=x11` as well; otherwise clipboard access can still target the desktop Wayland session. Xvfb must be
installed separately and was not available for the comparison below.

In the comparison recorded in [#4367](https://github.com/KaotoIO/kaoto/issues/4367), the same packaged extension and
VS Code 1.145.0 editor suite produced 13 passing tests and six failures (including setup/cleanup hooks) on Wayland,
then 30 passing tests and zero failures with the process environment above. No application or test-code changes were
needed. The Xvfb variant was not tested. Broader clipboard-dependent test hardening is tracked in
[#4322](https://github.com/KaotoIO/kaoto/issues/4322); this comparison did not investigate the separate unit-test
failures in [#4363](https://github.com/KaotoIO/kaoto/issues/4363).

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
