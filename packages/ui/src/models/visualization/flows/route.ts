/* eslint-disable no-case-declarations */
import { Choice, ProcessorDefinition, RouteDefinition, To } from '@kaoto-next/camel-catalog/types';
import get from 'lodash.get';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { EntityType } from '../../camel-entities/base-entity';
import { BaseVisualCamelEntity, IVisualizationNode, VisualComponentSchema } from '../base-visual-entity';
import { VisualizationNode } from '../visualization-node';
import { CamelComponentSchemaService } from './camel-component-schema.service';

export class CamelRoute implements BaseVisualCamelEntity {
  readonly id: string;
  readonly type = EntityType.Route;

  constructor(public route: Partial<RouteDefinition> = {}) {
    this.id = route.id ?? getCamelRandomId('route');
    this.route.id = this.id;
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (!path) return undefined;

    const componentModel = get(this.route, path);
    const visualComponentSchema = CamelComponentSchemaService.getVisualComponentSchema(path, componentModel);

    return visualComponentSchema;
  }

  getSteps(): ProcessorDefinition[] {
    return this.route.from?.steps ?? [];
  }

  toVizNode(): IVisualizationNode {
    const rootNode = new VisualizationNode((this.route.from?.uri as string) ?? '', this);
    rootNode.path = 'from';
    const vizNodes = this.getVizNodesFromSteps(this.getSteps(), `${rootNode.path}.steps`);

    const firstVizNode = vizNodes[0];
    if (firstVizNode !== undefined) {
      rootNode.setNextNode(firstVizNode);
      firstVizNode.setPreviousNode(rootNode);
    }

    return rootNode;
  }

  private getVizNodesFromSteps(camelRouteSteps: ProcessorDefinition[] = [], path: string): IVisualizationNode[] {
    return camelRouteSteps.reduce((acc, camelRouteStep, index) => {
      const previousVizNode = acc[acc.length - 1];
      const vizNode = this.getVizNodeFromStep(camelRouteStep, `${path}.${index}`);

      if (previousVizNode !== undefined) {
        previousVizNode.setNextNode(vizNode);
        vizNode.setPreviousNode(previousVizNode);
      }

      acc.push(vizNode);
      return acc;
    }, [] as IVisualizationNode[]);
  }

  private getVizNodeFromStep(processor: ProcessorDefinition, path: string): IVisualizationNode {
    const processorName = Object.keys(processor)[0];
    const parentStep = new VisualizationNode(processorName);
    parentStep.path = `${path}.${processorName}`;

    switch (processorName) {
      case 'choice':
        /** Bring when nodes */
        processor.choice?.when?.forEach((when, index) => {
          const whenNode = this.getChildren(
            'when',
            when.steps as ProcessorDefinition[],
            `${path}.choice.when.${index}.steps`,
          );
          whenNode.path = `${path}.choice.when.${index}`;
          parentStep.addChild(whenNode);
        });

        /** Bring otherwise nodes */
        const otherwiseNode = this.getChildren(
          'otherwise',
          (processor.choice as Choice).otherwise?.steps as ProcessorDefinition[],
          `${path}.choice.otherwise.steps`,
        );
        otherwiseNode.path = `${path}.choice.otherwise`;
        parentStep.addChild(otherwiseNode);

        break;

      case 'to':
        parentStep.label =
          typeof processor.to === 'string' ? processor.to : (processor.to as Exclude<To, string>).uri ?? 'To';
        break;
    }

    return parentStep;
  }

  private getChildren(label: string, steps: ProcessorDefinition[], path: string): IVisualizationNode {
    const node = new VisualizationNode(label);
    node.path = path;
    const children = this.getVizNodesFromSteps(steps, path);
    node.setChildren(children);
    children.forEach((child) => child.setParentNode(node));

    return node;
  }
}
