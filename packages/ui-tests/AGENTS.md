## @kaoto/kaoto-tests AGENTS.md

This package contains Storybook and Cypress E2E for the Kaoto UI.

### Requirements

- Node.js: >= 18.x
- Yarn: managed from repo root (`yarn@4.5.0`)

### Setup

From the repo root:

```bash
yarn install
```

### Storybook

```bash
# run Storybook locally
yarn workspace @kaoto/kaoto-tests storybook

# build static Storybook
yarn workspace @kaoto/kaoto-tests build:storybook

# publish to Chromatic (token configured in package script)
yarn workspace @kaoto/kaoto-tests chromatic
```

Tip: Build the UI library first if working with components that rely on its built artifacts.

```bash
yarn workspace @kaoto/kaoto build:lib
```

### Cypress E2E

```bash
# open interactive runner
yarn workspace @kaoto/kaoto-tests e2e

# run headless (default env excludes weekly tests)
yarn workspace @kaoto/kaoto-tests e2e:headless

# run weekly-tagged specs headless
yarn workspace @kaoto/kaoto-tests e2e:headless-weekly

# run against local preview server
# first, start preview from @kaoto/kaoto
yarn workspace @kaoto/kaoto preview &
# then run tests that target http://localhost:4173
yarn workspace @kaoto/kaoto-tests e2e-preview:headless
```

Run selected spec(s):

```bash
# from repo root, headless preview against http://localhost:4173
yarn workspace @kaoto/kaoto-tests e2e-preview:headless -- --spec cypress/e2e/designer/<test>.cy.ts

# multiple specs (comma-separated)
yarn workspace @kaoto/kaoto-tests e2e-preview:headless -- --spec cypress/e2e/designer/<test>.cy.ts,cypress/e2e/designer/<test2>.cy.ts
```

### Linting

```bash
yarn workspace @kaoto/kaoto-tests lint
yarn workspace @kaoto/kaoto-tests lint:fix
```

### Conventions

- Tests and stories use TypeScript.
- ESLint with Prettier is enforced. Follow the repository’s Prettier config (semicolons, single quotes, width 120, 2-space indent, trailing commas).
