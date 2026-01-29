/**
 * KOW Camel - Camel-specific tree implementation
 */
export { type CamelCatalogEntry, type ICamelKowNode } from './camel-kow-node';
export { CamelKowNode, createCamelKowTree, createFromTree, createRouteTree } from './camel-kow-node.impl';
export { CamelKowNodeType } from './camel-kow-node-type';
export { CamelNodeResolver } from './camel-node-resolver';

// Shared utilities
export {
  ENTITY_PROCESSORS,
  isDataformat,
  isEntity,
  isKnownEip,
  isKnownProcessor,
  isLanguage,
  isLoadbalancer,
  isPattern,
  PRIMITIVE_PROPERTIES,
  STEPS_PROPERTIES,
} from './camel-catalog-utils';
