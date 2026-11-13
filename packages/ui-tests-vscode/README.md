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
| Type-check the tests                     | `yarn workspace @kaoto/ui-tests-vscode build`         |
| Lint                                     | `yarn workspace @kaoto/ui-tests-vscode lint`          |
| Package the extension and run all tests  | `yarn workspace @kaoto/ui-tests-vscode test:ui`       |
| Remove downloads, compiled tests, VSIXes | `yarn workspace @kaoto/ui-tests-vscode test:ui:clean` |

ExTester runs the tests from their TypeScript sources: it loads the `src/**/*.test.ts` files and
`src/pageObjects/locators.ts` through [tsx](https://tsx.is), a dev dependency of this package, so nothing is compiled
first. tsx transpiles each file on its own and checks no types, so `build` runs `tsc` without output (CI runs it in the
Packages job), and `tsconfig.json` keeps `isolatedModules` on, which makes `tsc` report code that cannot be transpiled
file by file.

The ExTester Runner settings in the repository's `.vscode/settings.json` still run compiled tests from `out/`, because
the Runner cannot run the sources yet
([vscode-extension-tester#2667](https://github.com/redhat-developer/vscode-extension-tester/issues/2667)). Compile the
tests before you run them from the Runner:

```bash
yarn workspace @kaoto/ui-tests-vscode tsc --noEmit false --rootDir src --outDir out
```

`test:ui` packages the extension's current `dist/` into `vscode-kaoto.vsix` in this folder, so build the extension
first:

```bash
yarn workspace @kaoto/kaoto build:lib
yarn workspace vscode-kaoto build:prod
yarn workspace @kaoto/ui-tests-vscode test:ui
```

On Linux without a display, prefix the test command with `xvfb-run -a`. The views, project and deploy groups need Java
and JBang, and the deploy group also needs minikube.

### Against a prebuilt VSIX

CI builds the VSIX once and runs each group in its own job. Set `VSIX_FILE` (relative to this folder, or absolute) and
use the group scripts:

```bash
export VSIX_FILE=./kaoto-ci.vsix

yarn workspace @kaoto/ui-tests-vscode test:ui:vsix            # all groups (extester.config.json globs)
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:editor     # src/editor/*.test.ts
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:source     # src/source/*.test.ts
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:views      # src/views/*.test.ts
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:project    # src/project/*.test.ts
yarn workspace @kaoto/ui-tests-vscode test:ui:vsix:deploy     # src/deploy/*.test.ts (minikube settings)
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
  UI library or forms. Such a change reaches the extension only through the Kaoto webview, so these groups hold only
  tests that drive the webview.
- `linuxOnly` lists the groups that run on Linux only; deploy is one, because it needs minikube.
- `withoutJBang` lists the groups whose tests need neither Java nor JBang. Their jobs install neither, and skip the
  cache of the Maven and JBang downloads.

| Group     | Tests                                                                                              | Listed in                      |
| --------- | -------------------------------------------------------------------------------------------------- | ------------------------------ |
| `editor`  | Canvas, properties panel, editor tabs, node labels, the catalog picked in the status bar           | `all`, `smoke`, `withoutJBang` |
| `source`  | Toggle Source Code: the source editor beside the canvas, kept in sync with it                      | `all`, `smoke`, `withoutJBang` |
| `views`   | Kaoto views, New File, Run of a route, folder and workspace, Tests view                            | `all`                          |
| `project` | Maven dependency update, Explorer "Open with Kaoto", a custom catalog URL, export to a new project | `all`                          |
| `deploy`  | Deploy to minikube, Deployments view                                                               | `all`, `linuxOnly`             |

To add a group, add its folder under `src/`, a `test:ui:vsix:<group>` script, its glob in `extester.config.json` so that
`test:ui:vsix` runs it too, and its name in `ciTestGroups.all`. **CI does not run a group that is missing from
`ciTestGroups.all`.** Add it to `ciTestGroups.smoke` only if its tests drive the Kaoto webview, and to
`ciTestGroups.withoutJBang` only if none of them runs Camel JBang.

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
# Download VS Code/ChromeDriver and install the chosen VSIX.
VSIX_FILE=./kaoto-ci.vsix yarn setup:test:ui:vsix

# Run the editor group using the existing X11/XWayland display.
env -u ELECTRON_RUN_AS_NODE -u WAYLAND_DISPLAY \
  XDG_SESSION_TYPE=x11 KAOTO_DISABLE_WHATS_NEW=true \
  yarn exec extest run-tests 'src/editor/*.test.ts'
```

Use your actual VSIX path in the setup command. Both Wayland detection variables must be handled; clearing only one can
leave the Wayland clipboard backend selected. The installed `clipboardy` includes an `xsel` fallback for X11 clipboard
access. These environment changes apply only to the child process and leave the desktop session unchanged. XWayland
still uses the real desktop clipboard, so this is not clipboard isolation.

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

## Debugging a failing test locally

These notes come from tracking down a layout check that failed on CI only
([#4525](https://github.com/KaotoIO/kaoto/pull/4525)).

- **Start with the CI screenshot.** A failed group uploads the artifact `ui-test-screenshots-<group>-<os>` with a
  screenshot of the window at the moment of the failure.
- **Run one file or a few.** `extest run-tests` takes one or more globs. From the repository root, for example:
  `yarn workspace @kaoto/ui-tests-vscode exec extest run-tests 'src/editor/PropertyPanelLoading.test.ts' 'src/editor/SwitchBetweenTabs.test.ts'`.
  Quote each glob as an argument of its own; a list of files in one shell variable can reach ExTester as a single
  argument that matches nothing, and with `failZero` such a run fails with `0 passing`.
- **Iterate without repackaging.** After one `setup:test:ui:vsix`, a change to the tests only needs another
  `yarn workspace @kaoto/ui-tests-vscode exec extest run-tests …`, which loads the changed sources. Rebuild and reinstall
  the VSIX only when the extension or the UI changes.
- **The tests run zoomed out.** `src/vscode-settings.json` sets `window.zoomLevel: -3`, so `devicePixelRatio` is about
  0.58 and the webview's CSS viewport depends on the screen: a large local monitor gives a much taller layout than the
  Windows CI runner. A layout check can therefore pass locally and fail on CI. ExTester cannot resize the Electron
  window (`setRect` fails with `Browser.getWindowForTarget wasn't found`); to approximate the CI size, limit the editor
  from the test with `driver.executeScript`, e.g. `document.querySelector('.shell').style.height = '1550px'`. Setting
  the height of `html`, `body` or `#kaoto-editor` has no effect, because `.shell` uses `100vh`.
- **Measure inside the webview.** `console.log` output of the test, for example values returned by
  `driver.executeScript` from the Kaoto frame, appears in the mocha output.
- **Hung or still running?** Each WebDriver command is logged with a timestamp in `chromedriver.log` in the ExTester
  storage (`$TEST_RESOURCES`, by default `test-resources` in the system temp folder). If its last command is minutes
  old, the test waits on something outside the browser.

### Writing layout assertions

The zoom makes layout values fractional: `scrollTop` and element rectangles have fractions, while `clientHeight`,
`scrollHeight` and `scrollWidth` are rounded. Checks that add these up, such as
`scrollTop + clientHeight >= scrollHeight - 1`, can break when a dependency update shifts the layout by a fraction of
a pixel, even though nothing changed for the user.

- Assert what the user sees instead: for example, that the last field is inside the visible area of the scrolled
  container (`getBoundingClientRect`), or that a container draws no horizontal scrollbar
  (`offsetHeight - clientHeight - borders`), rather than comparing `scrollWidth` with `clientWidth`.
- Make the check hold on any screen size. If the whole content fits, there is nothing to scroll, and that should pass.
- Check once that the assertion still catches the bug it is for, by breaking the layout on purpose (for example a
  container that grows instead of scrolling) and confirming that the test fails.

## Layout

| Path                                                                 | Contents                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/editor`, `src/source`, `src/views`, `src/project`, `src/deploy` | Test groups; CI runs each group as its own job                            |
| `src/pageObjects`                                                    | Kaoto page objects; `locators.ts` is ExTester's `customPageObjects`       |
| `src/utils`                                                          | Helpers shared by the groups                                              |
| `src/vscode-settings*.json`                                          | User settings for the VS Code test instance                               |
| `src/.mocharc.json`                                                  | Mocha `failZero`: a run that finds no tests fails                         |
| `test Fixture with speci@l chars/`                                   | Workspace the tests open; its name contains spaces and special characters |
| `extester.config.json`                                               | ExTester setup and run options                                            |

The tests and `src/utils` locate the fixture from `__dirname` (`src/<folder>/../../`), so these files must stay one folder
below `src/`.
