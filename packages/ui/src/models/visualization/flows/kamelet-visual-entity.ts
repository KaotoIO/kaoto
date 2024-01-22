import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
/* eslint-disable no-case-declarations */
import { IKameletDefinition, IKameletMetadata, IKameletSpec } from '../..';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { EntityType } from '../../camel/entities';

export class KameletVisualEntity extends AbstractCamelVisualEntity {
  id: string;
  readonly type = EntityType.Kamelet;
  spec: IKameletSpec;
  metadata: IKameletMetadata;

  constructor(kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, from: kamelet?.spec.template.from });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.metadata = kamelet?.metadata ?? { name: this.id };
    this.spec = kamelet.spec;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.metadata.name = this.id;
  }

  protected getRootUri(): string | undefined {
    return this.spec.template.from?.uri;
  }
}
