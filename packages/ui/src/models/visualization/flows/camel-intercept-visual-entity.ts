import { Intercept, ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities/base-entity';
import { BaseVisualEntity, IVisualizationNode, IVisualizationNodeData, NodeInteraction } from '../base-visual-entity';
import { NodeIdentity } from '../node-identity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { NodeEnrichmentService } from './nodes/node-enrichment.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

export class CamelInterceptVisualEntity
  extends AbstractCamelVisualEntity<{ intercept: Intercept }>
  implements BaseVisualEntity
{
  id: string;
  readonly type = EntityType.Intercept;
  static readonly ROOT_PATH = 'intercept';

  constructor(public interceptDef: { intercept: Intercept } = { intercept: {} }) {
    super(interceptDef);
    const id = interceptDef.intercept.id ?? getCamelRandomId(CamelInterceptVisualEntity.ROOT_PATH);
    this.id = id;
    this.interceptDef.intercept.id = id;
  }

  static isApplicable(interceptDef: unknown): interceptDef is { intercept: Intercept } {
    if (!isDefined(interceptDef) || Array.isArray(interceptDef) || typeof interceptDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(interceptDef!);

    return objectKeys.length === 1 && this.ROOT_PATH in interceptDef! && typeof interceptDef.intercept === 'object';
  }

  getRootPath(): string {
    return CamelInterceptVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.interceptDef.intercept.id = id;
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
      data.primaryNodeId?.name as keyof ProcessorDefinition,
    );
    const canHavePreviousStep = CamelComponentSchemaService.canHavePreviousStep(
      data.primaryNodeId?.name as keyof ProcessorDefinition,
    );
    const canHaveChildren = stepsProperties.some((property) => property.type === 'branch');
    const canHaveSpecialChildren = Object.keys(stepsProperties).length > 1;
    const canReplaceStep = data.path !== CamelInterceptVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelInterceptVisualEntity.ROOT_PATH;
    const canBeDisabled = CamelComponentSchemaService.canBeDisabled(
      data.primaryNodeId?.name as keyof ProcessorDefinition,
    );

    return {
      canHavePreviousStep,
      canHaveNextStep: canHavePreviousStep,
      canHaveChildren,
      canHaveSpecialChildren,
      canReplaceStep,
      canRemoveStep,
      canRemoveFlow: data.path === CamelInterceptVisualEntity.ROOT_PATH,
      canBeDisabled,
    };
  }

  async toVizNode(): Promise<IVisualizationNode<IVisualizationNodeData>> {
    const interceptGroupNode = await NodeMapperService.getVizNode(
      CamelInterceptVisualEntity.ROOT_PATH,
      {
        primaryNodeId: {
          name: CamelInterceptVisualEntity.ROOT_PATH as keyof ProcessorDefinition,
          catalogKind: CatalogKind.Entity,
        } satisfies NodeIdentity,
      },
      this.interceptDef,
    );
    interceptGroupNode.data.entity = this;
    interceptGroupNode.data.isGroup = true;
    interceptGroupNode.data.catalogKind = CatalogKind.Entity;
    interceptGroupNode.data.name = this.type;
    interceptGroupNode.data.primaryNodeId = { name: this.type, catalogKind: CatalogKind.Entity };

    await NodeEnrichmentService.enrichVisualizationTree(interceptGroupNode);

    return interceptGroupNode;
  }

  toJSON(): { intercept: Intercept } {
    return { intercept: this.interceptDef.intercept };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
