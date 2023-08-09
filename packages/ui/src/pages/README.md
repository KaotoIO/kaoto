### Pages folder

This folder contains all the pages that are used in the application, usually representing navigation routes. Each page has its own folder with the following structure:

```
PageName
├── PageName.tsx
├── PageName.scss
├── PageName.test.ts
├── router-exports.ts
└── index.ts
```

- `PageName.tsx` contains the page implementation.
- `PageName.scss` contains the page styles, if applicable.
- `PageName.test.tsx` contains the page tests.
- `router-exports.tsx` contains the elements to be lazy loaded from the router.
- `index.ts` contains the page export.

These pages can use any global styles or data, since they are not meant to be exported.
