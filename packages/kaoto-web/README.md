# Kaoto Web

A client-side React application for Kaoto using Carbon Design System, built with Vite and TypeScript.

## Overview

This is the web interface for Kaoto - The Integration Designer for Apache Camel. It's a modern, client-side application built with React 19 and the Carbon Design System.

## Tech Stack

- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Vite 8** - Build tool and dev server
- **React Router 7** - Client-side routing
- **Carbon Design System** - IBM's open-source design system
- **Vitest** - Testing framework
- **Yarn 4** - Package manager

## Getting Started

### Prerequisites

- Node.js >= 22.x
- Yarn 4.x (configured via `packageManager` field)

### Installation

From the repository root:

```bash
# Install all dependencies
yarn install
```

### Development

```bash
# Start development server (from repository root)
yarn workspace @kaoto/kaoto-web dev
# or
yarn workspace @kaoto/kaoto-web start

# The app will be available at http://localhost:5173
```

### Build

```bash
# Build for production
yarn workspace @kaoto/kaoto-web build

# Preview production build
yarn workspace @kaoto/kaoto-web preview
```

## Available Scripts

- `yarn dev` / `yarn start` - Start development server
- `yarn build` - Build for production (includes type checking)
- `yarn type-check` - Run TypeScript type checking
- `yarn preview` - Preview production build locally
- `yarn lint` - Run all linters (ESLint, Stylelint, Prettier)
- `yarn lint-fix` - Fix linting issues automatically
- `yarn test` - Run tests with coverage
- `yarn test:watch` - Run tests in watch mode

## Testing

This package uses Vitest for unit testing, configured at the monorepo root level:

```bash
# Run tests from the workspace (recommended)
yarn workspace @kaoto/kaoto-web run test

# Or from this package directory
yarn test

# Watch mode
yarn workspace @kaoto/kaoto-web run test:watch
# or
yarn test:watch
```

See [VITEST-MIGRATION.md](../../VITEST-MIGRATION.md) in the repository root for details about the testing setup.

## Linting

Linting is configured with ESLint, Stylelint, and Prettier:

```bash
# Run all linters
yarn lint

# Auto-fix issues
yarn lint-fix

# Individual linters
yarn lint:es       # ESLint only
yarn lint:style    # Stylelint only
yarn lint:format   # Prettier only
```

## Development Notes

### Vitest Configuration

Tests for this package are configured in the root `/vitest.config.ts` as a project:

- Project name: `kaoto-web`
- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Setup file: `src/test/setup.ts`

### ESLint Configuration

- Extends the root ESLint configuration
- Ignores: `dist/**`, `coverage/**`, `*.config.*` files
- Uses strict React hooks rules (warnings only)
- Additional plugins: `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-refresh`

## Project Structure

```text
packages/kaoto-web/
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # Page layout components
│   ├── pages/             # Page components
│   ├── routes/            # Routing configuration
│   ├── test/              # Test utilities and setup
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── main.tsx           # Application entry point
│   └── main.scss          # Global styles
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## Monorepo Context

This package is part of the Kaoto monorepo:

- Main Kaoto UI: `@kaoto/kaoto` - The primary Kaoto application
- Testing infrastructure: `@kaoto/kaoto-tests` - Storybook and Cypress E2E tests
- Web application: `@kaoto/kaoto-web` - This package

## License

Apache License v2.0

## Links

- [Kaoto GitHub](https://github.com/KaotoIO/kaoto)
- [Carbon Design System](https://carbondesignsystem.com/)
- [Apache Camel](https://camel.apache.org/)
