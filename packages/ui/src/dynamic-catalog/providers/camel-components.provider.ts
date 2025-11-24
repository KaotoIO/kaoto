import { KaotoFunction } from '@kaoto/camel-catalog/types';

import { ICamelComponentDefinition } from '../../models/camel-components-catalog';
import { ICamelDataformatDefinition } from '../../models/camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../../models/camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from '../../models/camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from '../../models/camel-processors-catalog';
import { ICatalogProvider } from '../models';

abstract class BaseCamelProvider<T = unknown> implements ICatalogProvider<T> {
  abstract id: string;

  constructor(private readonly entities: Record<string, T> = {}) {}

  async fetch(key: string): Promise<T | undefined> {
    return this.entities[key];
  }

  async fetchAll(): Promise<Record<string, T>> {
    return this.entities;
  }
}

export class CamelComponentsProvider extends BaseCamelProvider<ICamelComponentDefinition> {
  readonly id = 'camel-components-provider';
}

export class CamelProcessorsProvider extends BaseCamelProvider<ICamelProcessorDefinition> {
  readonly id = 'camel-processors-provider';
}

export class CamelLanguageProvider extends BaseCamelProvider<ICamelLanguageDefinition> {
  readonly id = 'camel-languages-provider';
}

export class CamelDataformatProvider extends BaseCamelProvider<ICamelDataformatDefinition> {
  readonly id = 'camel-dataformats-provider';
}

export class CamelLoadbalancerProvider extends BaseCamelProvider<ICamelLoadBalancerDefinition> {
  readonly id = 'camel-loadbalancers-provider';
}

export class CamelFunctionProvider extends BaseCamelProvider<Record<string, KaotoFunction>> {
  readonly id = 'camel-functions-provider';
}
