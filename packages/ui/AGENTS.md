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

### Canvas interaction styling

- Keyboard focus, hover and selection on canvas nodes and placeholders are drawn by the `interaction-indicator` mixin in `src/components/Visualization/Custom/_custom.scss`; groups draw focus with `custom-group__focus-ring` in `CustomGroupExpanded.scss`. Each element shows focus exactly once.
- Do not add or change focus rings, outlines or other interaction indicators on the canvas as part of another change. A change to canvas interaction styling needs its own issue and an explicit decision from the maintainers.
- Before touching node, placeholder or group SCSS, read the comments there: they record deliberate design decisions.

### Notes on publishing

This package ships an ESM-only build under `lib/`, driven by `build:lib` (which runs `tsc --project tsconfig.lib.json`, copies SCSS/assets, and runs `write-version`). Consumers import from `@kaoto/kaoto`, `@kaoto/kaoto/components`, `@kaoto/kaoto/models`, and `@kaoto/kaoto/testing` via the defined exports map.
