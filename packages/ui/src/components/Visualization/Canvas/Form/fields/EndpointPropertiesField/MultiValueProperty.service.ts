import { isDefined } from '@kaoto/forms';

import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { ParsedParameters } from '../../../../../../utils';

export class MultiValuePropertyService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static readMultiValue(componentName: string, definition: any) {
    const catalogLookup = CamelCatalogService.getCatalogLookup(componentName);

    const multiValueParameters: Map<string, string> = new Map<string, string>();
    if (catalogLookup?.definition?.properties !== undefined) {
      Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
        if (value.multiValue) multiValueParameters.set(key, value.prefix!);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parameters: any = {};

    if (multiValueParameters.size > 0) {
      multiValueParameters.forEach((prefix, key) => {
        const nestParameters: ParsedParameters = {};

        Object.entries(definition).forEach(([paramKey, paramValue]) => {
          if (paramKey.startsWith(prefix)) {
            nestParameters[paramKey.replace(prefix, '')] = paramValue as string;
          } else {
            parameters[paramKey] = paramValue;
          }
        });

        parameters[key] = { ...nestParameters };
      });
    } else {
      parameters = { ...definition };
    }

    return parameters;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMultiValueSerializedDefinition(componentName: string, definition: any): ParsedParameters | undefined {
    if (!componentName || !isDefined(definition)) {
      return definition;
    }

    const catalogLookup = CamelCatalogService.getCatalogLookup(componentName);
    if (catalogLookup.catalogKind === CatalogKind.Component) {
      const multiValueParameters: Map<string, string> = new Map<string, string>();
      if (catalogLookup.definition?.properties !== undefined) {
        Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
          if (value.multiValue) multiValueParameters.set(key, value.prefix!);
        });
      }
      const defaultMultiValues: ParsedParameters = {};
      const filteredParameters = definition.parameters;

      if (definition.parameters !== undefined) {
        Object.keys(definition.parameters).forEach((key) => {
          if (multiValueParameters.has(key)) {
            if (definition.parameters[key] === undefined) {
              return;
            }
            Object.keys(definition.parameters[key]).forEach((subKey) => {
              defaultMultiValues[multiValueParameters.get(key) + subKey] = definition.parameters[key][subKey];
            });
            delete filteredParameters[key];
          }
        });
      }
      return { ...definition, parameters: { ...filteredParameters, ...defaultMultiValues } };
    }
    return definition;
  }
}
