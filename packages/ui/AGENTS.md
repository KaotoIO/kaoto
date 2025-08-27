## @kaoto/kaoto AGENTS.md

This is the main UI package (Vite + React + TypeScript). Use these commands during development, review, and CI.

### Requirements

- Node.js: >= 18.x
- Yarn: managed from repo root (`yarn@4.5.0`)

### Setup

From the repo root:

```bash
yarn install
```

### Development

```bash
yarn workspace @kaoto/kaoto start
# Dev server default: http://localhost:5173
```

### Build

```bash
# App build (Vite)
yarn workspace @kaoto/kaoto build

# Library builds (public API outputs)
yarn workspace @kaoto/kaoto build:lib
```

### Preview

```bash
yarn workspace @kaoto/kaoto preview
# http://localhost:4173
```

### Tests

```bash
yarn workspace @kaoto/kaoto test
yarn workspace @kaoto/kaoto test:watch
```

### Linting

```bash
# TypeScript/React
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto lint:fix

# Styles
yarn workspace @kaoto/kaoto lint:style
yarn workspace @kaoto/kaoto lint:style:fix
```

### Code Style

- TypeScript strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- ESLint with React and React Hooks rules; Prettier enforced.
- Prettier: semicolons, single quotes, width 120, 2 spaces, trailing commas.

### Notes on publishing

This package exposes ESM and CJS builds under `lib/esm` and `lib/cjs`, driven by `build:lib` (which runs `copy-catalog`, `build:esm`, `build:cjs`, and `write-version`). Consumers import from `@kaoto/kaoto`, `@kaoto/kaoto/components`, `@kaoto/kaoto/models`, and `@kaoto/kaoto/testing` via the defined exports map.
