// Ambient declarations (asset modules, build-time globals, vite/client) this entry point needs when
// another package consumes it as TypeScript source through the `@kaoto/source` export condition.
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./global.d.ts" />
/// <reference path="./vite-env.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */

export * from './external/RouteVisualization/RouteVisualization';
