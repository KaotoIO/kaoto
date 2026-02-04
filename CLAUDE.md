# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaoto is a visual editor for Apache Camel integrations, offering support for creating and editing Camel Routes, Kamelets, and Pipes. Built with React, TypeScript, and PatternFly and Carbon components.

## Repository Structure

- **packages/ui/**: Main Kaoto application (`@kaoto/kaoto`)
  - React/TypeScript app with Vite build system
  - PatternFly UI components
  - Monaco editor integration
  - State management with Zustand and MobX
- **packages/ui-tests/**: Testing infrastructure (`@kaoto/kaoto-tests`)
  - Cypress e2e tests
  - Storybook stories
  - Testing utilities

## Common Commands

### Development

```bash
# Start development server (main UI)
yarn workspace @kaoto/kaoto run start

# Build the web application
yarn workspace @kaoto/kaoto run build

# Build library version, to be used as a dependency of [VS Code Kaoto](https://github.com/KaotoIO/vscode-kaoto)
yarn workspace @kaoto/kaoto run build:lib
```

### Testing

```bash
# Run unit tests
yarn workspace @kaoto/kaoto run test

# Run tests in watch mode
yarn workspace @kaoto/kaoto run test:watch

# Run e2e tests (Cypress GUI)
yarn workspace @kaoto/kaoto-tests run e2e

# Run e2e tests headless
yarn workspace @kaoto/kaoto-tests run e2e:headless
```

### Linting & Code Quality

```bash
# TypeScript/JavaScript linting
yarn workspace @kaoto/kaoto run lint
yarn workspace @kaoto/kaoto run lint:fix

# CSS/SCSS linting
yarn workspace @kaoto/kaoto run lint:style
yarn workspace @kaoto/kaoto run lint:style:fix
```

### Storybook

```bash
# First build the UI library
yarn workspace @kaoto/kaoto build:lib

# Run Storybook locally
yarn workspace @kaoto/kaoto-tests storybook

# Build Storybook
yarn workspace @kaoto/kaoto-tests build:storybook

# Publish to Chromatic
yarn workspace @kaoto/kaoto-tests chromatic
```

## Architecture

### UI Package Structure

- **src/components/**: React components organized by feature
  - Catalog, DataMapper, Document, ErrorBoundary
  - Canvas, Visualization, KaotoDrawer components
  - Form components for configuration
- **src/camel-utils/**: Camel-specific utilities and parsers
- **src/models/**: Data models and state management
- **src/store/**: Zustand stores for global state
- **src/hooks/**: Custom React hooks
- **src/assets/**: Static assets including component icons

### Key Technologies

- **Frontend**: React 19, TypeScript 5.x, Vite
- **UI Framework**: PatternFly 6.x components
- **State Management**: Zustand with Zundo for undo/redo, MobX for complex state
- **Code Editor**: Monaco Editor with YAML support
- **Visualization**: React Topology from PatternFly
- **Testing**: Jest, React Testing Library, Cypress
- **Build**: Vite with dual ESM/CJS output for library builds

### Monorepo Setup

- Uses Yarn workspaces
- Shared dependencies managed at root level with resolutions

## Development Guidelines

### Running Single Tests

To run a specific test file:

```bash
yarn workspace @kaoto/kaoto run test -- --testPathPattern="YourTestFile"
```

For specific test patterns:

```bash
yarn workspace @kaoto/kaoto run test -- --testPathPattern="generateEntityContextMenu" --silent
```

### Code Style

- ESLint + Prettier configuration
- TypeScript strict mode enabled
- SCSS with Stylelint for styling
- PatternFly design system conventions

### Prerequisites

- Node.js >= 22.x
- Yarn >= 4.x (packageManager specified as yarn@4.9.4)
- Git with conventional commits (Husky pre-commit hooks configured)

### VS Code Configuration

Jest testing is configured with root path pointing to `packages/ui` and test command `yarn test`.
