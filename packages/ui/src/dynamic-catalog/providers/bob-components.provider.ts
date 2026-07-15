import { IBobComponentDefinition } from '../../models';
import { ICatalogProvider } from '../models';

abstract class BaseBobProvider<T = unknown> implements ICatalogProvider<T> {
  abstract id: string;

  constructor(private readonly entities: Record<string, T> = {}) {}

  async fetch(key: string): Promise<T | undefined> {
    return this.entities[key];
  }

  async fetchAll(): Promise<Record<string, T>> {
    return this.entities;
  }
}

export class BobToolsProvider extends BaseBobProvider<IBobComponentDefinition> {
  readonly id = 'bob-tools-provider';
}

export class BobComponentsProvider extends BaseBobProvider<IBobComponentDefinition> {
  readonly id = 'bob-components-provider';
}
