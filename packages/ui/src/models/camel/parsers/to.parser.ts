import { To } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { CatalogKind } from '../../catalog-kind';

type ToObject = Extract<To, object>;
interface ParsedToObject extends ToObject {
  uri: string;
  parameters: Required<ToObject>['parameters'];
}

export const toParser = async (originalTo: To | undefined): Promise<ParsedToObject> => {
  let fullUri = '';
  const parsedTo: ParsedToObject = { uri: '', parameters: {} };
  if (typeof originalTo === 'string') {
    fullUri = originalTo;
  } else if (typeof originalTo === 'object' && originalTo !== null) {
    fullUri = originalTo.uri ?? '';
    parsedTo.parameters = originalTo.parameters ?? {};
  }

  const [pathPortion, queryStringPortion] = fullUri.split('?');
  const componentName = CamelUriHelper.getSyntaxWithoutSchema(pathPortion).schema;
  const directComponentDefinition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, componentName);

  const pathParameters = CamelUriHelper.getParametersFromPathString(
    directComponentDefinition?.component.syntax,
    pathPortion,
    { requiredParameters: directComponentDefinition?.propertiesSchema.required as string[] },
  );
  const queryParameters = CamelUriHelper.getParametersFromQueryString(queryStringPortion);

  parsedTo.uri = componentName;
  parsedTo.parameters = {
    ...parsedTo.parameters,
    ...pathParameters,
    ...queryParameters,
  };

  return parsedTo;
};
