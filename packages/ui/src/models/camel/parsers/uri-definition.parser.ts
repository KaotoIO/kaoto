import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { CatalogKind } from '../../catalog-kind';

export const uriDefinitionParser = async (
  componentName: string,
  definition: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const fullUri = definition.uri as string | undefined;
  if (!fullUri) return definition;

  const [pathPortion, queryStringPortion] = fullUri.split('?');

  const componentDefinition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, componentName);
  if (!componentDefinition) {
    // For unknown components (e.g. kamelet:log-sink which isn't a plain Component catalog entry),
    // still ensure parameters exists and extract any query parameters from the URI
    const queryParameters = queryStringPortion ? CamelUriHelper.getParametersFromQueryString(queryStringPortion) : {};
    return {
      ...definition,
      uri: pathPortion,
      parameters: {
        ...(definition.parameters as Record<string, unknown>),
        ...queryParameters,
      },
    };
  }

  const pathParameters = CamelUriHelper.getParametersFromPathString(componentDefinition.component.syntax, pathPortion, {
    requiredParameters: componentDefinition.propertiesSchema.required as string[],
  });
  const queryParameters = CamelUriHelper.getParametersFromQueryString(queryStringPortion);

  return {
    ...definition,
    uri: componentName,
    parameters: {
      ...(definition.parameters as Record<string, unknown>),
      ...pathParameters,
      ...queryParameters,
    },
  };
};
