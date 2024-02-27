import { setValue } from './set-value';
import { IKameletDefinition } from '../models/kamelets-catalog';

export const getActualKameletSchemaFromCustomSchema = (
  kamelet: IKameletDefinition,
  value: Record<string, unknown>,
): void => {
  kamelet.metadata.name = value.name as string;
  kamelet.spec.definition.title = value.title as string;
  kamelet.spec.definition.description = value.description as string;

  const customAnnotations = {
    'camel.apache.org/kamelet.icon': value.icon,
    'camel.apache.org/kamelet.support.level': value.supportLevel,
    'camel.apache.org/catalog.version': value.catalogVersion,
    'camel.apache.org/provider': value.provider,
    'camel.apache.org/kamelet.group': value.group,
    'camel.apache.org/kamelet.namespace': value.namespace,
  };

  setValue(kamelet.metadata, 'labels', { ...(value.labels as object), 'camel.apache.org/kamelet.type': value.type });
  setValue(kamelet.metadata, 'annotations', { ...(value.annotations as object), ...customAnnotations });
};
