---
title: Tools and integrations
type: tools-reference
version: 1.0
tags: [tools, integrations, systems]
---

# Tools and integrations

## Development tools

**Code repository**: GitHub — `KaotoIO/kaoto` (upstream); contributors fork to their own accounts  
**Package manager**: Yarn 4.x (workspaces)  
**Build tool**: Vite 5+  
**Language**: TypeScript (strict mode)  
**CI/CD**: GitHub Actions (`.github/workflows/`) — `build-lint-test.yml`, `e2e-tests.yml`, `chromatic.yml`  
**Testing**: Vitest (unit), Cypress (E2E), Storybook + Chromatic (visual regression)  
**Static analysis**: SonarCloud (runs on PRs via external integration), ESLint + Prettier (local)

## Collaboration tools

**Communication**: GitHub Issues and Discussions — the primary public channels for the project
**Documentation**: [kaoto.io](https://kaoto.io/) — public product website
**Design**: Figma (used occasionally for UX work)

## Project management

**Issue tracking**: GitHub Issues (`KaotoIO/kaoto`)
**Roadmap**: [kaoto.io/roadmap](https://kaoto.io/roadmap/)

## Analytics and monitoring

**Website analytics**: Visitor statistics recorded for kaoto.io  
**Error tracking**: None currently  
**Product analytics**: None currently

## Key integrations

- **Apache Camel catalog**: Generated via OpenJDK tooling; powers the component palette, Kamelet library, and property forms in the UI. Never hand-edit generated catalog files — regenerate with project tooling.
- **`@patternfly/react-topology`**: Canvas rendering library used by the visual route editor
- **VS Code extension API**: `vscode-kaoto` embeds the Kaoto UI as a webview inside VS Code
