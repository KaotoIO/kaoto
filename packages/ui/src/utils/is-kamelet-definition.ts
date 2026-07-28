import { IKameletDefinition } from '../models/camel/kamelets-catalog';

export const isKameletDefinition = (entityDefinition: unknown): entityDefinition is IKameletDefinition => {
  return (
    typeof entityDefinition === 'object' &&
    entityDefinition !== null &&
    'spec' in entityDefinition &&
    typeof entityDefinition.spec === 'object' &&
    entityDefinition.spec !== null &&
    'template' in entityDefinition.spec &&
    typeof entityDefinition.spec.template === 'object' &&
    entityDefinition.spec.template !== null &&
    'from' in entityDefinition.spec.template
  );
};
