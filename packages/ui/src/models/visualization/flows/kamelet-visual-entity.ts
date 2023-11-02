import { v4 as uuidv4 } from 'uuid';
import { EntityType } from '../../camel/entities';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';

export class KameletVisualEntity implements BaseVisualCamelEntity {
  readonly id = uuidv4();
  type = EntityType.Kamelet;

  constructor(json: unknown) {
    json;
    // TODO
  }

  getComponentSchema(path: string | undefined): VisualComponentSchema | undefined {
    path;
    return undefined; // TODO
  }

  getId(): string {
    return ''; // TODO
  }

  getNodeInteraction(_data: IVisualizationNodeData): NodeInteraction {
    throw new Error('Method not implemented.');
  }

  getSteps(): unknown[] {
    return []; // TODO
  }

  addStep(): void {
    return; // TODO
  }

  removeStep(): void {
    return; // TODO
  }

  toJSON(): unknown {
    return undefined; // TODO
  }

  toVizNode(): IVisualizationNode {
    return createVisualizationNode({ label: '' }); // TODO
  }

  updateModel(path: string | undefined, value: unknown): void {
    path;
    value;
    // TODO
  }
}
