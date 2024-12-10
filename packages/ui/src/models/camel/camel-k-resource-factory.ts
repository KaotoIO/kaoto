import { SourceSchemaType } from './source-schema-type';
import { CamelResource } from './camel-resource';
import { IntegrationResource } from './integration-resource';
import { KameletResource } from './kamelet-resource';
import { KameletBindingResource } from './kamelet-binding-resource';
import { PipeResource } from './pipe-resource';
import { IKameletDefinition } from '../kamelets-catalog';
import {
  Integration as IntegrationType,
  KameletBinding as KameletBindingType,
  Pipe as PipeType,
} from '@kaoto/camel-catalog/types';

export class CamelKResourceFactory {
  static getCamelKResource(json?: unknown, type?: SourceSchemaType): CamelResource | undefined {
    const jsonRecord = json ? (json as Record<string, unknown>) : {};

    if ((jsonRecord && typeof json === 'object' && 'kind' in jsonRecord) || type) {
      switch (jsonRecord['kind'] || type) {
        case SourceSchemaType.Integration:
          return new IntegrationResource(json as IntegrationType);
        case SourceSchemaType.Kamelet:
          return new KameletResource(json as IKameletDefinition);
        case SourceSchemaType.KameletBinding:
          return new KameletBindingResource(json as KameletBindingType);
        case SourceSchemaType.Pipe:
          return new PipeResource(json as PipeType);
      }
    }
    return undefined;
  }
}
