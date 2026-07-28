/**
 * React-layer exports from the dynamic-catalog module.
 *
 * Model-level code (services, abstract classes, serializers) must NOT import
 * from this file — it pulls in React providers and hooks which form circular
 * dependencies with the model graph.
 *
 * Use `dynamic-catalog/index.ts` (or direct sub-paths) for pure registry
 * and model types.
 */
export * from './catalog.provider';
export * from './catalog-tiles.provider';
export * from './use-catalog-tiles.hook';
