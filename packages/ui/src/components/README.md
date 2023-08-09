### Components folder

This folder contains all the components that are used in the application. Each component has its own folder with the following structure:

```
ComponentName
├── ComponentName.tsx
├── ComponentName.md
├── ComponentName.scss
├── ComponentName.stories.ts
├── ComponentName.test.ts
└── index.ts
```

- `ComponentName.tsx` contains the component implementation.
- `ComponentName.md` contains the component documentation, if applicable.
- `ComponentName.scss` contains the component styles, if applicable.
- `ComponentName.stories.tsx` contains the component stories, if applicable but highly encouraged.
- `ComponentName.test.tsx` contains the component tests.
- `index.ts` contains the component export.

These components shouldn't use any global styles nor data, they should be self-contained and reusable, as these components are meant to be exported to be consumed by other applications through the [`public-api.ts`](../public-api.ts) file.
