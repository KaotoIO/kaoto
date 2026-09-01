import { BaseEntity } from '../../../models/entities';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { RestEntity } from '../../../models/visualization/flows/rest-entity';

/** Helper to get REST-related entities (non-visual after refactor) */
export const getRestEntities = (entities: BaseEntity[]): RestEntity[] =>
  entities.filter((e) => e instanceof CamelRestVisualEntity || e instanceof CamelRestConfigurationVisualEntity);
