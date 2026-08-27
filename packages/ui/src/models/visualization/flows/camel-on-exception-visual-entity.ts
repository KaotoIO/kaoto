import { OnException, ProcessorDefinition } from '@kaoto/camel-catalog/types';
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

export class CamelOnExceptionVisualEntity
  extends AbstractCamelVisualEntity<{ onException: OnException }>
  implements BaseVisualEntity
{
  id: string;
  readonly type = EntityType.OnException;
  private static readonly ROOT_PATH = 'onException';

  constructor(public onExceptionDef: { onException: OnException } = { onException: {} }) {
    super(onExceptionDef);
    const id = onExceptionDef.onException.id ?? getCamelRandomId(CamelOnExceptionVisualEntity.ROOT_PATH);
    this.id = id;
    this.onExceptionDef.onException.id = id;
  }

  static isApplicable(onExceptionDef: unknown): onExceptionDef is { onException: OnException } {
    if (!isDefined(onExceptionDef) || Array.isArray(onExceptionDef) || typeof onExceptionDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(onExceptionDef!);

    return (
      objectKeys.length === 1 && this.ROOT_PATH in onExceptionDef! && typeof onExceptionDef.onException === 'object'
    );
  }

  getRootPath(): string {
    return CamelOnExceptionVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
    this.onExceptionDef.onException.id = id;
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
    const canReplaceStep = data.path !== CamelOnExceptionVisualEntity.ROOT_PATH;
    const canRemoveStep = data.path !== CamelOnExceptionVisualEntity.ROOT_PATH;
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
      canRemoveFlow: data.path === CamelOnExceptionVisualEntity.ROOT_PATH,
      canBeDisabled,
    };
  }

  async toVizNode(): Promise<IVisualizationNode<IVisualizationNodeData>> {
    const onExceptionGroupNode = await NodeMapperService.getVizNode(
      CamelOnExceptionVisualEntity.ROOT_PATH,
      {
        primaryNodeId: {
          name: CamelOnExceptionVisualEntity.ROOT_PATH as keyof ProcessorDefinition,
          catalogKind: CatalogKind.Entity,
        } satisfies NodeIdentity,
      },
      this.onExceptionDef,
    );
    onExceptionGroupNode.data.entity = this;
    onExceptionGroupNode.data.isGroup = true;
    onExceptionGroupNode.data.catalogKind = CatalogKind.Entity;
    onExceptionGroupNode.data.name = this.type;
    onExceptionGroupNode.data.primaryNodeId = { name: this.type, catalogKind: CatalogKind.Entity };

    await NodeEnrichmentService.enrichVisualizationTree(onExceptionGroupNode);

    return onExceptionGroupNode;
  }

  toJSON(): { onException: OnException } {
    return { onException: this.onExceptionDef.onException };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
