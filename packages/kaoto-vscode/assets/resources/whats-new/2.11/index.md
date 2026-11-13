# Kaoto 2.11 released

We are happy to announce that new version of extension was released!

<img src="./featured.png" alt="Kaoto 2.11" width="75%">

## Key highlights of this release

This release brings significant enhancements to testing capabilities with Citrus framework integration, expanded DataMapper functionality for complex schema handling, improved runtime management with multiple executor options, and visual editor improvements. Powered by Apache Camel 4.20.0, Kaoto continues to make visual integration design more powerful and intuitive.

---

## ⚠️ Breaking Changes & Migration Guide

This release includes settings renames and removals. **If you customized any JBang-related settings, you must update them manually after upgrading.**

### Renamed Settings

The `kaoto.camelJbang.*` settings namespace has been replaced with `kaoto.executor.*`:

| Old Setting (v2.10.x)                            | New Setting (v2.11.0)                          |
| ------------------------------------------------ | ---------------------------------------------- |
| `kaoto.camelJbang.runArguments`                  | `kaoto.executor.runArguments`                  |
| `kaoto.camelJbang.runFolderOrWorkspaceArguments` | `kaoto.executor.runFolderOrWorkspaceArguments` |
| `kaoto.camelJbang.redHatMavenRepository`         | `kaoto.executor.redHatMavenRepository`         |
| `kaoto.camelJbang.redHatMavenRepository.global`  | `kaoto.executor.redHatMavenRepository.global`  |
| `kaoto.camelJbang.kubernetesRunArguments`        | `kaoto.executor.kubernetesRunArguments`        |
| `kaoto.maven.camelJbang.exportProjectArguments`  | `kaoto.maven.executor.exportProjectArguments`  |

**Action:** Open your `settings.json` and rename any `kaoto.camelJbang.*` entries to their `kaoto.executor.*` equivalents.

### Removed Settings

| Setting                    | Migration                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kaoto.camelJbang.version` | No longer needed. The Camel version is now determined by the selected catalog. Default fallback is `4.20.0`.                                     |
| `kaoto.camelVersion`       | Replaced by the new catalog picker — use the status bar to select your runtime catalog, or set `kaoto.runtimeCatalogName` in workspace settings. |

### Settings UI Reorganized

- The **JBang** section has been renamed to **Executor**
- A new **Advanced** section holds catalog-related workspace settings
- Canvas settings (nodeLabel, colorTheme, etc.) remain unchanged under **Canvas**

### Default Camel CLI Version: 4.18.0 → 4.20.0

The default Camel version used for CLI operations has been updated. If your integrations depend on 4.18.x-specific behavior, verify compatibility with [Camel 4.20.0 release notes](https://camel.apache.org/releases/release-4.20.0/).

### Red Hat Productized Catalog Requires Maven Configuration

When using Red Hat productized Camel versions (e.g. `4.8.0.redhat-00017`), you **MUST** configure the Red Hat recommended repositories in your Maven `settings.xml`. Without this configuration, the Red Hat catalog — which is a default option — will not function correctly.

The extension will show a notification guiding you through this setup when a productized catalog is selected. Refer to the [Red Hat Maven Repository documentation](https://docs.redhat.com/es/documentation/red_hat_build_of_apache_camel/4.18/html/getting_started_with_red_hat_build_of_apache_camel_for_spring_boot/set-up-maven-locally#add-red-hat-repositories-to-maven) for details on configuring your `~/.m2/settings.xml`.

---

### Citrus Testing Capabilities

Kaoto 2.11 introduces comprehensive Citrus framework integration, bringing automated testing capabilities directly into your visual integration design workflow:

- **Visual Test Design**: Create and manage Citrus tests directly within Kaoto's visual editor with dedicated test action icons and a test action library (send, receive, echo, sleep, etc.)
- **Auto-Open in Kaoto Editor**: Citrus test files (`*.citrus.yaml`, `*.citrus.test.yaml`, `*.citrus.it.yaml`, `*.citrus-test.yaml`, `*.citrus-it.yaml`) now automatically open in the Kaoto visual editor
- **Test Execution**: Run Citrus tests directly from Kaoto's Tests view to validate your integration behavior during development
- **Citrus Endpoint Configuration**: Specialized configuration fields for Citrus endpoints with proper protocols and message formats

<p align="center">
    <img src="./tests-view.png" alt="Kaoto VS Code extension with Citrus testing support" width="20%">
</p>

<p align="center">
    <img src="./test-icons.png" alt="Dedicated icons for Citrus test actions" width="50%">
</p>

---

### Catalog and Runtime Management

#### Multiple Executors

The extension now supports two executor backends, selectable via the `kaoto.executor.type` setting:

- **Camel CLI** (default): The traditional and stable Camel JBang CLI executor with full feature support
- **Camel Launcher** (experimental): A new executor that requires no JBang installation — the launcher JAR is automatically downloaded and managed by the extension (Java required)

All executor-related settings are consolidated under the `kaoto.executor.*` namespace.

<p align="center">
    <img src="./settings.png" alt="Executor selection in Kaoto settings" width="60%">
</p>

#### Catalog Version Picker

A new **status bar item** shows the currently selected Camel catalog version and lets you switch between available versions with a single click. The picker filters catalogs based on the open file — showing Camel runtimes (Main, Quarkus, Spring Boot) for integration files and Citrus versions for test files.

---

### DataMapper Enhancements

- **Rendering Engine Re-invented**: Enterprise-grade rendering with virtual scrolling for flawless navigation through large data mappings with complex document schemas
- **Field Override**: Support for overriding document fields using XML schema substitution groups and `xs:extension`/`xs:restriction` hierarchies
- **Abstract Elements**: Substitution candidates shown as children in the document tree for direct mapping
- **Choice Improvements**: Enhanced `xs:choice` support with dedicated context menu options
- **Auto Mapping via Drag & Drop**: Automatic for-each, copy-of, or individual child mappings when dragging between compatible fields
- **Double-Click XPath Editing**: Double-click a target field to write XPath expressions directly
- **XSLT Comments**: Add comments to generated XSLT with tooltip preview on hover

---

### Canvas and Visual Editor

- **Route AutoStartup Toggle**: Toggle switch in the route title bar for controlling the autoStartup property
- **Space Bar Navigation**: Move the canvas by pressing and holding the Space bar
- **Container Selection Styles**: Visual feedback highlighting possible drop zones when moving elements
- **Property Search in REST Editor**: Search functionality for quickly finding properties in the REST DSL editor
- **Custom Properties Configuration**: Key/value configuration format for endpoint properties in components like To, ToD, and Kamelet

<p align="center">
    <img src="./autostartup-toggle.png" alt="Route autoStartup toggle in the title bar" width="30%">
</p>

<p align="center">
    <img src="./toD.png" alt="ToD component showing key/value configuration format for endpoint properties" width="60%">
</p>

---

### Camel JBang Upgrade

This release upgrades the default Camel JBang version from **4.18.0 to 4.20.0**, bringing the latest features, performance improvements, and bug fixes from the Apache Camel community.

---

For a full list of changes please refer to the [change log.](https://github.com/KaotoIO/kaoto/releases/tag/2.11.0)

### Let's Build it Together

Let us know what you think by joining us in the [GitHub discussions](https://github.com/orgs/KaotoIO/discussions).
Do you have an idea how to improve Kaoto? Would you love to see a useful feature implemented or simply ask a question? Please [create an issue](https://github.com/KaotoIO/kaoto/issues/new/choose).

### A big shoutout to our amazing contributors

Thank you to everyone who made this release possible!

Whether you are contributing code, reporting bugs, or sharing feedback in our [GitHub discussions](https://github.com/KaotoIO/kaoto/discussions), your involvement is what keeps the Camel riding! 🐫🎉
