import { getValue } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { CitrusTestResource } from '../../../citrus/citrus-test-resource';
import { Test } from '../../../citrus/entities/Test';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { CamelCatalogService } from '../../flows/camel-catalog.service';

export class EndpointsEntityHandler {
  constructor(private testResource?: CitrusTestResource | undefined) {
    if (!this.testResource) return;
  }

  getEndpointsSchema(): KaotoSchemaDefinition['schema'] | undefined {
    const endpointsCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.TestEndpoint) ?? {};
    const endpoints: KaotoSchemaDefinition['schema'][] = [];
    for (const endpointKey in endpointsCatalog) {
      const endpointDefinition = endpointsCatalog[endpointKey];
      const schema = endpointsCatalog[endpointKey].propertiesSchema as KaotoSchemaDefinition['schema'];
      if (schema) {
        schema.name = endpointKey;
        schema.title = endpointDefinition.title;
        endpoints.push(schema);
      }
    }

    return {
      oneOf: endpoints.sort((a, b) => a.name?.localeCompare(b.name)),
    };
  }

  getTestEntity() {
    return this.testResource?.toJSON() as Test;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDefinedEndpointsNameAndType(endpoints: Record<string, any>[]): { name: string; type: string }[] {
    const definedEndpoints: { name: string; type: string }[] = [];

    for (const endpoint of endpoints) {
      if (endpoint.type !== undefined) {
        definedEndpoints.push({ name: endpoint.name ?? ('' as string), type: endpoint.type ?? ('unknown' as string) });
      } else {
        const type = this.getEndpointType(endpoint);
        if (type) {
          const name = this.findEndpointName(type, endpoint);
          if (name) {
            definedEndpoints.push({ name: name, type: type });
          }
        }
      }
    }

    return definedEndpoints;
  }

  getAllEndpointsNameAndType(): { name: string; type: string }[] {
    const testEntity = this.getTestEntity();
    const allEndpoints: { name: string; type: string }[] = this.getDefinedEndpointsNameAndType(
      testEntity.endpoints || [],
    );

    for (const action of testEntity.actions) {
      if (action.createEndpoint != undefined) {
        const jsonRecord = action.createEndpoint as Record<string, unknown>;
        const type = this.getEndpointType(jsonRecord);
        if (type) {
          const name = this.findEndpointName(type, jsonRecord);
          if (name) {
            allEndpoints.push({ name: name, type: type });
          }
        }
      }
    }

    return allEndpoints;
  }

  getEndpointType(endpoint: Record<string, unknown>): string | undefined {
    if (!endpoint) {
      return undefined;
    }

    let endpointType: string = '';
    for (const key in endpoint) {
      if (endpoint[key] !== undefined && typeof endpoint[key] === 'object') {
        endpointType = key;
        break;
      }
    }

    const subType = endpoint[endpointType] as Record<string, unknown>;
    for (const key in subType) {
      if (subType[key] !== undefined && typeof subType[key] === 'object') {
        endpointType = `${endpointType}.${key}`;
      }
    }

    return endpointType;
  }

  findEndpointName(path: string, endpoint: Record<string, unknown>): string {
    const properties = getValue(endpoint, path, {}) as Record<string, unknown>;
    if (properties.name) {
      return properties.name as string;
    }

    return endpoint.name ? (endpoint.name as string) : '';
  }

  updateEndpoint(type: string, model: Record<string, unknown>, prevName: string | undefined) {
    const test = this.getTestEntity();

    if (!test.endpoints) {
      this.addNewEndpoint(type, model);
      return;
    }

    const endpointName = prevName || model['name'];
    if (endpointName) {
      const index = test.endpoints.findIndex((endpoint) => {
        const type = this.getEndpointType(endpoint);
        if (type) {
          const name = this.findEndpointName(type, endpoint);
          if (name && name === endpointName) {
            return true;
          }
        }
      });

      if (index > -1) {
        test.endpoints[index] = this.createEndpoint(type, model);
      }
    }
  }

  addNewEndpoint(type: string, model: Record<string, unknown>) {
    const test = this.getTestEntity();

    if (!test.endpoints) {
      test.endpoints = [];
    }

    test.endpoints.push(this.createEndpoint(type, model));
  }

  private createEndpoint(type: string, model: Record<string, unknown>) {
    const tokens = type.split('-', 2);
    const endpoint = {} as Record<string, unknown>;
    const subType = {} as Record<string, unknown>;
    endpoint[tokens[0]] = subType;
    subType[tokens[1]] = model;
    return endpoint;
  }
}
