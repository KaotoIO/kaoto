import { ICitrusComponentDefinition } from '../../models';
import { ICatalogProvider } from '../models';

abstract class BaseCitrusProvider<T = unknown> implements ICatalogProvider<T> {
  abstract id: string;

  constructor(private readonly entities: Record<string, T> = {}) {}

  async fetch(key: string): Promise<T | undefined> {
    return this.entities[key];
  }

  async fetchAll(): Promise<Record<string, T>> {
    return this.entities;
  }
}

export class CitrusTestActionsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-actions-provider';
}

export class CitrusTestContainersProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-containers-provider';
}

export class CitrusTestEndpointsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-endpoints-provider';
}

export class CitrusTestFunctionsProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-functions-provider';
}

export class CitrusTestValidationMatcherProvider extends BaseCitrusProvider<ICitrusComponentDefinition> {
  readonly id = 'citrus-test-validation-matcher-provider';
}
