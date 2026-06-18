# Kaoto AGENTS.md

Kaoto is a visual editor for Apache Camel integrations. This monorepo uses Yarn workspaces and Vite for the UI, plus Cypress and Storybook for testing and docs.

## AI Agent Contribution Guidelines

AI agents are welcome contributors to Kaoto. When contributing code via AI assistance:

### Human Oversight Required

- AI agents **cannot** submit PRs independently
- A human must review, approve, and sign all AI-generated code
- The human reviewer is responsible for:
  - Code quality and correctness
  - Responding to maintainer feedback
  - Following up on PR comments

### Git Workflow

- **Never push to branches you didn't create** - If a contributor's PR needs changes, suggest them via review comments, but do not push to their branch without explicit permission
- **Use forks** - Prefer pushing branches to your fork rather than the main Kaoto repository to avoid cluttering the branch list with uncleaned branches
- **Branch naming** - Use descriptive names with issue numbers when possible: `fix/issue-123-canvas-rendering` or `feature/routing-editor`
- **Branch cleanup** - Delete branches after the PR is merged or rejected

### PR Guidelines

- **Volume limit** - Do not open more than 10 PRs per day per operator to ensure human reviewers can keep up
- **Quality over quantity** - Fewer well-tested PRs are better than many shallow ones
- **Active follow-up required** - PRs without response after **2 weeks** will be closed
- If you need more time, communicate with maintainers

### Quality Standards

Before submitting AI-generated PRs:

```bash
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto lint:style
yarn workspace @kaoto/kaoto test
```

- Ensure all tests pass
- Fix any linter errors
- Verify changes work as expected in the running application
- For UI changes affecting stories or E2E flows, also run Storybook and/or Cypress as needed
- Avoid introducing new static code analysis issues: code smells, maintainability regressions, CWE (Common Weakness Enumeration), Top OWASP vulnerabilities and security flows, deprecated code usage
- Changes should aim to preserve or improve overall code quality

### Disclosure and Documentation

- Disclosing AI tool usage is **optional but recommended**
- Mentioning your AI tool helps us improve AGENTS.md
- If you discover gaps in our agent documentation, please suggest improvements

For complete contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Quick Start

```bash
# Install dependencies
yarn install

# Start dev server
yarn workspace @kaoto/kaoto start
# → http://localhost:5173

# Before committing
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto test
```

---

## Repository Structure

```
kaoto/
├── packages/
│   ├── ui/                    # Main Kaoto application (@kaoto/kaoto)
│   │   ├── src/
│   │   │   ├── components/    # React components (Catalog, DataMapper, Visualization, etc.)
│   │   │   ├── models/        # Data models (camel, citrus, datamapper, entities)
│   │   │   ├── camel-utils/   # Camel-specific utilities and parsers
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── providers/     # React context providers
│   │   │   ├── layout/        # Layout components
│   │   │   ├── pages/         # Page-level components
│   │   │   ├── assets/        # Static assets including component icons
│   │   │   └── router/        # React Router configuration
│   │   ├── public/            # Static public assets
│   │   └── dist/              # Build output
│   └── ui-tests/              # Testing infrastructure (@kaoto/kaoto-tests)
│       ├── cypress/           # E2E tests (specs, fixtures, support)
│       ├── stories/           # Storybook stories
│       └── .storybook/        # Storybook configuration
├── .github/                   # GitHub Actions workflows and templates
├── assets/                    # Documentation assets
└── nginx/                     # Nginx configuration for deployment
```

---

## Development Workflow

### Local Development

```bash
# run dev server for @kaoto/kaoto
yarn workspace @kaoto/kaoto start
# default dev URL: http://localhost:5173
```

### Preview (static preview server)

```bash
yarn workspace @kaoto/kaoto preview
# default preview URL: http://localhost:4173
```

### Running Tests

Unit tests (UI):

```bash
yarn workspace @kaoto/kaoto test
yarn workspace @kaoto/kaoto test:watch
```

E2E tests and Storybook live here: `@kaoto/kaoto-tests` (see that package's AGENTS.md for details).

### Linting and Formatting

UI code lint:

```bash
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto lint:fix
```

Styles lint:

```bash
yarn workspace @kaoto/kaoto lint:style
yarn workspace @kaoto/kaoto lint:style:fix
```

Tests/Stories lint (ui-tests):

```bash
yarn workspace @kaoto/kaoto-tests lint
yarn workspace @kaoto/kaoto-tests lint:fix
```

### Before Committing

Always run before opening PRs:

```bash
yarn workspace @kaoto/kaoto lint
yarn workspace @kaoto/kaoto test
```

---

## Code Style and Conventions

- **TypeScript**: strict mode enabled (`strict: true`), `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **ESLint**: TypeScript + Prettier integration; React and React Hooks rules enabled in the UI package
- **Prettier**: semicolons required, single quotes, width 120, 2-space indent, trailing commas

Reference settings:

- Prettier highlights: `semi: true`, `singleQuote: true`, `printWidth: 120`, `tabWidth: 2`, `trailingComma: 'all'`

---

## Build & Release

```bash
# build the UI
yarn workspace @kaoto/kaoto build

# build the public component library outputs
yarn workspace @kaoto/kaoto build:lib
```

---

## Advanced / Optional

### Storybook

```bash
# from ui-tests package
yarn workspace @kaoto/kaoto-tests storybook
# build static storybook
yarn workspace @kaoto/kaoto-tests build:storybook
```

### Chromatic

```bash
yarn workspace @kaoto/kaoto-tests chromatic
```

### Docker (trial)

```bash
docker run --rm -p 8080:8080 --name kaoto quay.io/kaotoio/kaoto-app:main
```

---

## Reference

### Packages

- `@kaoto/kaoto` — main UI (Vite + React + TypeScript)
- `@kaoto/kaoto-tests` — Storybook and Cypress E2E for the UI

### Requirements

- Node.js: >= 22.x
- Yarn: 4.x (this repo sets `"packageManager": "yarn@4.9.4"`)
- OpenJDK: >= 17 (only needed if working with Camel catalog generation)

### Monorepo Tips (Yarn workspaces)

- Use `yarn workspace <package-name> <script>` from the repo root
- Package names:
  - `@kaoto/kaoto`
  - `@kaoto/kaoto-tests`
