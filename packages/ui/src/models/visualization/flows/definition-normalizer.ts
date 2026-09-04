import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { CatalogKind } from '../../catalog-kind';
import { IVisualizationNodeIds } from '../base-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

const parseQueryParameters = (queryString: string | undefined): Record<string, unknown> =>
  queryString ? CamelUriHelper.getParametersFromQueryString(queryString) : {};

export const normalizeDefinition = async (definition: unknown, ids?: IVisualizationNodeIds): Promise<unknown> => {
  if (definition == null) return definition;

  // Step 1: String coercion — some processors store their value as a plain string
  const processorName = ids?.primaryNodeId?.name;
  let normalized: unknown = definition;
  if (processorName !== undefined) {
    const prop = CamelComponentSchemaService.PROCESSOR_STRING_DEFINITIONS[processorName];
    if (prop && typeof normalized === 'string') {
      normalized = { [prop]: normalized };
    }
  }

  // Step 2: Null-param guard
  if (
    normalized != null &&
    typeof normalized === 'object' &&
    'parameters' in (normalized as object) &&
    (normalized as Record<string, unknown>).parameters == null
  ) {
    (normalized as Record<string, unknown>).parameters = {};
  }

  // Step 3: URI expansion — only when a component name can be derived from ids
  const componentName =
    ids?.secondaryNodeId?.name === 'kamelet' && ids?.tertiaryNodeId?.name !== undefined
      ? `kamelet:${ids.tertiaryNodeId.name}`
      : ids?.secondaryNodeId?.name;

  if (!componentName) return normalized;

  const def = normalized as Record<string, unknown>;
  const fullUri = def.uri as string | undefined;
  if (!fullUri) return def;

  const questionMarkIndex = fullUri.indexOf('?');
  const pathPortion = questionMarkIndex === -1 ? fullUri : fullUri.slice(0, questionMarkIndex);
  const queryStringPortion = questionMarkIndex === -1 ? undefined : fullUri.slice(questionMarkIndex + 1);

  const componentDefinition = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, componentName);
  if (!componentDefinition) {
    return {
      ...def,
      uri: pathPortion,
      parameters: {
        ...(def.parameters as Record<string, unknown>),
        ...parseQueryParameters(queryStringPortion),
      },
    };
  }

  const pathParameters = CamelUriHelper.getParametersFromPathString(componentDefinition.component.syntax, pathPortion, {
    requiredParameters: componentDefinition.propertiesSchema.required as string[],
  });
  const queryParameters = CamelUriHelper.getParametersFromQueryString(queryStringPortion);

  return {
    ...def,
    uri: componentName,
    parameters: {
      ...(def.parameters as Record<string, unknown>),
      ...pathParameters,
      ...queryParameters,
    },
  };
};
