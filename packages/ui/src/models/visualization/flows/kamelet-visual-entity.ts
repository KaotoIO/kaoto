import { v4 as uuidv4 } from 'uuid';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from '../base-visual-entity';
import { EntityType } from '../../camel/entities';
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

  getSteps(): unknown[] {
    return []; // TODO
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
