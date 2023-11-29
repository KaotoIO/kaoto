import { EntityType } from '../../camel/entities';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';

export class KameletVisualEntity implements BaseVisualCamelEntity {
  id = getCamelRandomId('kamelet');
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

  setId(routeId: string): void {
    this.id = routeId;
    // TODO
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
