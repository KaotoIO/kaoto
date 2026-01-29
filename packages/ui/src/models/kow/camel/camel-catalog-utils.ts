/**
 * Camel Catalog Utilities
 *
 * Shared constants and type-checking functions for working with Camel catalogs.
 * Used by CamelNodeResolver, SortingVisitor, and other KOW components.
 */
import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CatalogKind } from '../../catalog-kind';

/**
 * Processors that are Camel Entities (top-level constructs)
 */
export const ENTITY_PROCESSORS = new Set([
  'route',
  'from',
  'intercept',
  'interceptFrom',
  'interceptSendToEndpoint',
  'onException',
  'onCompletion',
  'errorHandler',
]);

/**
 * Properties that are always primitives (never contain nested EIPs)
 */
export const PRIMITIVE_PROPERTIES = new Set(['id', 'description', 'uri', 'disabled']);

/**
 * Properties that contain arrays of steps/EIPs
 */
export const STEPS_PROPERTIES = new Set(['steps']);

/**
 * Lazy getter for registry to avoid initialization issues during import
 */
const getRegistry = () => DynamicCatalogRegistry.get();

/**
 * Check if name is an entity processor
 */
export function isEntity(name: string): boolean {
  return ENTITY_PROCESSORS.has(name);
}

/**
 * Check if name is a known EIP/Pattern
 */
export function isPattern(name: string): boolean {
  const entry = getRegistry().getEntityFromCache(CatalogKind.Pattern, name);
  return entry !== undefined;
}

/**
 * Check if name is a language
 */
export function isLanguage(name: string): boolean {
  const entry = getRegistry().getEntityFromCache(CatalogKind.Language, name);
  return entry !== undefined;
}

/**
 * Check if name is a dataformat
 */
export function isDataformat(name: string): boolean {
  const entry = getRegistry().getEntityFromCache(CatalogKind.Dataformat, name);
  return entry !== undefined;
}

/**
 * Check if name is a loadbalancer
 */
export function isLoadbalancer(name: string): boolean {
  const entry = getRegistry().getEntityFromCache(CatalogKind.Loadbalancer, name);
  return entry !== undefined;
}

/**
 * Check if name is a known processor (entity or pattern)
 */
export function isKnownProcessor(name: string): boolean {
  return isEntity(name) || isPattern(name);
}

/**
 * Check if name is a known EIP (any type: pattern, language, dataformat, loadbalancer)
 */
export function isKnownEip(name: string): boolean {
  return isPattern(name) || isLanguage(name) || isDataformat(name) || isLoadbalancer(name);
}
