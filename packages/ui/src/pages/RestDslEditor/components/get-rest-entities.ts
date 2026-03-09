import { BaseCamelEntity } from '../../../models/camel/entities';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';

/** Helper to get REST-related entities (non-visual after refactor) */
export const getRestEntities = (
  entities: BaseCamelEntity[],
): (CamelRestVisualEntity | CamelRestConfigurationVisualEntity)[] =>
  entities.filter((e) => e instanceof CamelRestVisualEntity || e instanceof CamelRestConfigurationVisualEntity);
