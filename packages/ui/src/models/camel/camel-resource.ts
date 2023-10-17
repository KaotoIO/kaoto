import { BaseVisualCamelEntity } from '../visualization/base-visual-entity';
import { BaseCamelEntity } from './entities';
import { CamelRouteResource } from './camel-route-resource';
import { IntegrationResource } from './integration-resource';
import { KameletResource } from './kamelet-resource';
import { KameletBindingResource } from './kamelet-binding-resource';
import { PipeResource } from './pipe-resource';
import { SourceSchemaType } from './source-schema-type';

export const CAMEL_K_K8S_API_VERSION_V1 = 'camel.apache.org/v1';

export interface CamelResource {
  getVisualEntities(): BaseVisualCamelEntity[];
  getEntities(): BaseCamelEntity[];
  supportsMultipleVisualEntities(): boolean;
  toJSON(): unknown;
  getType(): SourceSchemaType;
  addEntity(entity: BaseCamelEntity): void;
}

/**
 * Creates a CamelResource based on the given {@link type} and {@link json}. If
 * both are not specified, a default empty {@link CamelRouteResource} is created.
 * If only {@link type} is specified, an empty {@link CamelResource} of the given
 * {@link type} is created.
 * @param type
 * @param json
 */
export function createCamelResource(json?: unknown, type?: SourceSchemaType): CamelResource {
  const jsonRecord = json as Record<string, unknown>;
  if (json && typeof json === 'object' && 'kind' in jsonRecord) {
    return doCreateCamelResource(json, jsonRecord['kind'] as SourceSchemaType);
  } else {
    return doCreateCamelResource(json, type || SourceSchemaType.Route);
  }
}

function doCreateCamelResource(json?: unknown, type?: SourceSchemaType): CamelResource {
  switch (type) {
    case SourceSchemaType.Integration:
      return new IntegrationResource(json);
    case SourceSchemaType.Kamelet:
      return new KameletResource(json);
    case SourceSchemaType.KameletBinding:
      return new KameletBindingResource(json);
    case SourceSchemaType.Pipe:
      return new PipeResource(json);
    default:
      return new CamelRouteResource(json);
  }
}
