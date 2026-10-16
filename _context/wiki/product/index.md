---
title: Product overview
type: product-info
version: 1.0
last_updated: 2025-01-01
tags: [product, features, users]
---

# Product overview

## What we build

Kaoto is a visual, low-code editor for Apache Camel integrations. It lets users create, edit, and manage Camel routes through a graphical canvas — without needing to hand-write YAML or Java DSL. It ships as a standalone web app and as a VS Code extension available on the VS Code Marketplace.

## Target users

**Primary users**: Integration developers, enterprise architects, and open-source Apache Camel users — spanning all skill levels from beginners to experts  
**Use cases**: Creating and editing Camel routes visually, managing integration pipelines, exploring the Camel component catalog, mapping data transformations

## Key features

1. **Visual canvas**: Drag-and-drop route editor powered by `@patternfly/react-topology`
2. **Component catalog**: Searchable library of all Camel components, EIPs, and Kamelets
3. **DataMapper**: Visual field-mapping editor for data transformations
4. **VS Code extension**: Embedded Kaoto editor inside VS Code (available on VS Code Marketplace)
5. **Multi-format support**: Reads and writes Camel YAML DSL, Camel Pipe/Kamelet resources

## Product architecture

Kaoto is a Yarn monorepo with three main packages:

- **`@kaoto/kaoto`** (`packages/ui`) — Main React + TypeScript + Vite application
- **`@kaoto/kaoto-tests`** (`packages/ui-tests`) — Cypress E2E tests and Storybook stories
- **`vscode-kaoto`** (`packages/kaoto-vscode`) — VS Code extension wrapping the UI - see [`packages/kaoto-vscode/AGENTS.md`](../../../packages/kaoto-vscode/AGENTS.md) |

The UI communicates with the Camel catalog (generated from OpenJDK tooling) to power the component palette and property forms.

## Product strategy

Current priorities:
- **DataMapper**: Improve and expand data mapping support
- **UX**: Continuously improve the editor experience for all skill levels
- **New functionality**: Add capabilities to keep pace with Apache Camel evolution

## Non-goals

The following are explicitly out of scope:
- No cloud deployment
- No Java DSL editing (YAML DSL only)
