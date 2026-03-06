import { ICitrusComponentDefinition } from '../../models';
import { ICatalogProvider } from '../models';

/**
 * Base provider class for Citrus catalog components.
 * Implements the ICatalogProvider interface to fetch Citrus component definitions.
 *
 * @template T - The type of entities managed by this provider (defaults to unknown)
 */
abstract class BaseCitrusProvider<T = unknown> implements ICatalogProvider<T> {
  abstract id: string;

  constructor(private readonly entities: Record<string, T> = {}) {}

  /**
   * Fetches a single entity by its key.
   *
   * @param key - The unique identifier for the entity
   * @returns A promise resolving to the entity or undefined if not found
   */
  async fetch(key: string): Promise<T | undefined> {
    return this.entities[key];
  }

  /**
   * Fetches all entities managed by this provider.
   *
   * @returns A promise resolving to a record of all entities keyed by their identifiers
   */
  async fetchAll(): Promise<Record<string, T>> {
    return this.entities;
  }
}

/**
 * Provider for Citrus test action components.
 * Manages the catalog of available test actions that can be used in Citrus tests.
 */
export class CitrusTestActionsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-actions-provider';
}

/**
 * Provider for Citrus test container components.
 * Manages the catalog of test containers (e.g., iterate, sequential, parallel) that can hold nested test actions.
 */
export class CitrusTestContainersProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-containers-provider';
}

/**
 * Provider for Citrus test endpoint components.
 * Manages the catalog of available endpoints for sending and receiving messages in tests.
 */
export class CitrusTestEndpointsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-endpoints-provider';
}

/**
 * Provider for Citrus test function components.
 * Manages the catalog of available functions that can be used in test expressions.
 */
export class CitrusTestFunctionsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-functions-provider';
}

/**
 * Provider for Citrus validation matcher components.
 * Manages the catalog of validation matchers used for asserting message content in tests.
 */
export class CitrusTestValidationMatcherProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-validation-matcher-provider';
}
