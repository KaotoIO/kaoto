## Kaoto AGENTS.md

Kaoto is a visual editor for Apache Camel integrations. This monorepo uses Yarn workspaces and Vite for the UI, plus Cypress and Storybook for testing and docs. Use the commands below when building, testing, or linting.

### Packages

- `@kaoto/kaoto` — main UI (Vite + React + TypeScript)
- `@kaoto/kaoto-tests` — Storybook and Cypress E2E for the UI

### Requirements

- Node.js: >= 18.x
- Yarn: 4.x (this repo sets `"packageManager": "yarn@4.5.0"`)
- OpenJDK: >= 17 (only needed if working with Camel catalog generation)

### Setup

```bash
yarn install
```

### Development (UI)

```bash
# run dev server for @kaoto/kaoto
yarn workspace @kaoto/kaoto start
# default dev URL: http://localhost:5173
```

### Build

```bash
# build the UI
yarn workspace @kaoto/kaoto build

# build the public component library outputs
yarn workspace @kaoto/kaoto build:lib
```

### Preview (static preview server)

```bash
yarn workspace @kaoto/kaoto preview
# default preview URL: http://localhost:4173
```

### Tests

- Unit tests (UI):

```bash
yarn workspace @kaoto/kaoto test
yarn workspace @kaoto/kaoto test:watch
```

- E2E tests and Storybook live here: `@kaoto/kaoto-tests` (see that package’s AGENTS.md for details).

### Linting and Formatting

- UI code lint:

```bash
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto lint:fix
```

- Styles lint:

```bash
yarn workspace @kaoto/kaoto lint:style
yarn workspace @kaoto/kaoto lint:style:fix
```

- Tests/Stories lint (ui-tests):

```bash
yarn workspace @kaoto/kaoto-tests lint
yarn workspace @kaoto/kaoto-tests lint:fix
```

### Storybook

```bash
# from ui-tests package
yarn workspace @kaoto/kaoto-tests storybook
# build static storybook
yarn workspace @kaoto/kaoto-tests build:storybook
```

### Chromatic (optional)

```bash
yarn workspace @kaoto/kaoto-tests chromatic
```

### Docker (trial)

```bash
docker run --rm -p 8080:8080 --name kaoto quay.io/kaotoio/kaoto-app:main
```

### Code Style and Conventions

- TypeScript: strict mode enabled (`strict: true`), `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- ESLint: TypeScript + Prettier integration; React and React Hooks rules enabled in the UI package.
- Prettier: semicolons required, single quotes, width 120, 2-space indent, trailing commas.

Reference settings:

- Prettier highlights: `semi: true`, `singleQuote: true`, `printWidth: 120`, `tabWidth: 2`, `trailingComma: 'all'`.

### Monorepo tips (Yarn workspaces)

- Use `yarn workspace <package-name> <script>` from the repo root.
- Package names:
  - `@kaoto/kaoto`
  - `@kaoto/kaoto-tests`

### CI/Agent expectations

- Before committing or opening PRs, run:

```bash
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto test
```

- For UI changes affecting stories or E2E flows, also run Storybook and/or Cypress as needed.
