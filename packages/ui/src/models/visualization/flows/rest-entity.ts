import { BaseEntity } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { IVisualizationNodeIds } from '../base-visual-entity';

/** The model operations used by the REST DSL editor. */
export interface RestEntity extends BaseEntity {
  getRootPath(): string;
  getId(): string;
  setId(id: string): void;
  fetchNodeSchema(ids?: IVisualizationNodeIds): Promise<KaotoSchemaDefinition['schema'] | undefined>;
  getNodeDefinition(path?: string, ids?: IVisualizationNodeIds): unknown;
  getParsedDefinition(path?: string, ids?: IVisualizationNodeIds): Promise<unknown>;
  updateModel(path: string | undefined, value: unknown): void;
  removeStep(path?: string): void;
}
