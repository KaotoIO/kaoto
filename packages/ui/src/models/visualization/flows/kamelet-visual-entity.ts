import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
/* eslint-disable no-case-declarations */
import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import { IKameletDefinition, IKameletMetadata, IKameletSpec } from '../..';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { BaseVisualCamelEntity, IVisualizationNode } from '../base-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

export class KameletVisualEntity extends AbstractCamelVisualEntity implements BaseVisualCamelEntity {
  id: string;
  type = EntityType.Kamelet;
  spec: IKameletSpec;
  metadata: IKameletMetadata;

  constructor(kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, from: kamelet?.spec.template.from });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.metadata = kamelet?.metadata ?? { name: this.id };
    this.spec = kamelet.spec;
  }

  /** Internal API methods */
  getId(): string {
    return this.id;
  }

  setId(routeId: string): void {
    this.id = routeId;
    this.metadata.name = this.id;
  }

  toVizNode(): IVisualizationNode {
    const rootNode = this.getVizNodeFromProcessor('from', {
      processorName: 'from' as keyof ProcessorDefinition,
      componentName: CamelComponentSchemaService.getComponentNameFromUri(this.spec.template.from!.uri),
    });
    rootNode.data.entity = this;

    if (!this.spec.template.from?.uri) {
      rootNode.data.icon = NodeIconResolver.getPlaceholderIcon();
    }
    return rootNode;
  }
}
