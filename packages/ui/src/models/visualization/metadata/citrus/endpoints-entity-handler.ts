import { isDefined } from '@kaoto/forms';

import { getValue } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { CitrusTestResource } from '../../../citrus/citrus-test-resource';
import { Test } from '../../../citrus/entities/Test';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { CamelCatalogService } from '../../flows/camel-catalog.service';

export class EndpointsEntityHandler {
  constructor(readonly testResource?: CitrusTestResource | undefined) {
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

    const sortedEndpoints = [...endpoints];
    sortedEndpoints.sort((a, b) => a.name?.localeCompare(b.name));

    return {
      oneOf: sortedEndpoints,
    };
  }

  getTestEntity(): Test | undefined {
    return this.testResource?.toJSON() as Test | undefined;
  }

  getEndpoints(): Record<string, unknown>[] {
    const testEntity = this.getTestEntity();
    if (!testEntity) {
      return [];
    }

    return testEntity.endpoints || [];
  }

  getDefinedEndpointsNameAndType(): { name: string; type: string }[] {
    const endpoints = this.getEndpoints();
    const definedEndpoints: { name: string; type: string }[] = [];

    for (const endpoint of endpoints) {
      if (isDefined(endpoint.type)) {
        definedEndpoints.push({ name: (endpoint.name as string) ?? '', type: (endpoint.type as string) ?? 'unknown' });
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
    if (!testEntity) {
      return [];
    }

    const allEndpoints: { name: string; type: string }[] = this.getDefinedEndpointsNameAndType();

    for (const action of testEntity.actions ?? []) {
      if (action.createEndpoint !== undefined) {
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
      if (key === 'type') {
        return endpoint[key] as string;
      }

      if (isDefined(endpoint[key]) && typeof endpoint[key] === 'object') {
        endpointType = key;
        break;
      }
    }

    const subType = endpoint[endpointType] as Record<string, unknown>;
    if (isDefined(subType)) {
      for (const key in subType) {
        if (isDefined(subType[key]) && typeof subType[key] === 'object') {
          endpointType = `${endpointType}.${key}`;
        }
      }
    }

    return endpointType;
  }

  getEndpoint(index: number): Record<string, unknown> | undefined {
    const endpoints = this.getEndpoints();
    if (index > endpoints.length) {
      return undefined;
    }

    return endpoints[index];
  }

  findEndpointName(path: string, endpoint: Record<string, unknown>): string {
    const properties = getValue(endpoint, path, {}) as Record<string, unknown>;
    if (properties.name) {
      return properties.name as string;
    }

    return endpoint.name ? (endpoint.name as string) : '';
  }

  updateEndpoint(type: string, model: Record<string, unknown>, prevName: string | undefined) {
    const endpoints = this.getEndpoints();

    if (!endpoints.length) {
      this.addNewEndpoint(type, model);
      return;
    }

    const endpointName = prevName || model['name'];
    if (endpointName) {
      const index = endpoints.findIndex((endpoint) => {
        const foundType = this.getEndpointType(endpoint);
        if (foundType) {
          const name = this.findEndpointName(foundType, endpoint);
          if (name && name === endpointName) {
            return true;
          }
        }
        return false;
      });

      if (index > -1) {
        endpoints[index] = this.createEndpoint(type, model);
      } else {
        endpoints.push(this.createEndpoint(type, model));
      }
    }
  }

  addNewEndpoint(type: string, model: Record<string, unknown>) {
    const test = this.getTestEntity();
    if (!test) {
      return;
    }

    test.endpoints ??= [];
    test.endpoints.push(this.createEndpoint(type, model));
  }

  deleteEndpoint(index: number) {
    const endpoints = this.getEndpoints();
    if (index > endpoints.length) {
      return;
    }

    endpoints.splice(index, 1);
  }

  private createEndpoint(type: string, model: Record<string, unknown>) {
    const [root, subType] = type.split('-', 2);
    if (!root) {
      return model;
    }

    if (!subType) {
      return { [root]: model };
    }

    return { [root]: { [subType]: model } };
  }
}
