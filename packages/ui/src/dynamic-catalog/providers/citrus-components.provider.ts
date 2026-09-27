import { parse } from 'yaml';

import {
  CatalogKind,
  FileTypes,
  FileTypesResponse,
  ICitrusComponentDefinition,
  ICitrusTestActionTemplateDefinition,
} from '../../models';
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

/** Provider for reusable Citrus test action templates. */
export class CitrusTestActionTemplatesProvider implements ICatalogProvider<ICitrusTestActionTemplateDefinition> {
  readonly id = 'citrus-test-action-templates-provider';

  constructor(
    private readonly client: (filetype: FileTypes) => Promise<FileTypesResponse[]> = () => Promise.resolve([]),
  ) {}

  async fetch(key: string): Promise<ICitrusTestActionTemplateDefinition | undefined> {
    const templates = await this.fetchAll();
    return Object.prototype.hasOwnProperty.call(templates, key) ? templates[key] : undefined;
  }

  async fetchAll(): Promise<Record<string, ICitrusTestActionTemplateDefinition>> {
    const resources = (await this.client(FileTypes.CitrusTemplates)) ?? [];
    const entries: [string, ICitrusTestActionTemplateDefinition][] = [];
    for (const { filename, content } of resources) {
      try {
        const template: unknown = parse(content);
        if (!isRecord(template) || typeof template.name !== 'string' || !template.name.trim()) {
          throw new TypeError('Missing template name');
        }
        if (template.description !== undefined && typeof template.description !== 'string') {
          throw new TypeError('Template description must be a string');
        }
        const definition: ICitrusTestActionTemplateDefinition = {
          kind: CatalogKind.TestActionTemplate,
          name: template.name,
          ...(template.description !== undefined ? { description: template.description } : {}),
          ...(template.parameters !== undefined ? { parameters: parseTemplateParameters(template.parameters) } : {}),
        };
        entries.push([definition.name, definition]);
      } catch (error) {
        console.error(`Error parsing Citrus template ${filename}`, error);
      }
    }
    return Object.fromEntries(entries);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseTemplateParameters(value: unknown): NonNullable<ICitrusTestActionTemplateDefinition['parameters']> {
  if (!Array.isArray(value)) {
    throw new TypeError('Template parameters must be an array');
  }
  return value.map((parameter: unknown) => {
    if (
      !isRecord(parameter) ||
      typeof parameter.name !== 'string' ||
      !parameter.name.trim() ||
      !(parameter.value === null || ['string', 'number', 'boolean'].includes(typeof parameter.value))
    ) {
      throw new TypeError('Template parameters must have a name and a scalar value');
    }
    return { name: parameter.name, value: parameter.value as string | number | boolean | null };
  });
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
