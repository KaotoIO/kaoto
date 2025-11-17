import {
  Integration as IntegrationType,
  KameletBinding as KameletBindingType,
  Pipe as PipeType,
} from '@kaoto/camel-catalog/types';

import { isDefined } from '../../utils';
import { IKameletDefinition } from '../kamelets-catalog';
import { CamelResource } from './camel-resource';
import { IntegrationResource } from './integration-resource';
import { KameletBindingResource } from './kamelet-binding-resource';
import { KameletResource } from './kamelet-resource';
import { PipeResource } from './pipe-resource';
import { SourceSchemaType } from './source-schema-type';

export class CamelKResourceFactory {
  static getCamelKResource(
    json?: IntegrationType | IKameletDefinition | KameletBindingType | PipeType,
    type?: SourceSchemaType,
  ): CamelResource | undefined {
    const jsonRecord =
      isDefined(json) && !Array.isArray(json) && typeof json === 'object' ? (json as Record<string, unknown>) : {};
    const kind = jsonRecord['kind'] ?? type;

    if (!isDefined(kind)) {
      return undefined;
    }

    switch (kind) {
      case SourceSchemaType.Integration:
        return new IntegrationResource(jsonRecord as IntegrationType);
      case SourceSchemaType.Kamelet:
        return new KameletResource(jsonRecord as IKameletDefinition);
      case SourceSchemaType.KameletBinding:
        return new KameletBindingResource(jsonRecord as KameletBindingType);
      case SourceSchemaType.Pipe:
        return new PipeResource(jsonRecord as PipeType);
      default:
        return undefined;
    }
  }
}
