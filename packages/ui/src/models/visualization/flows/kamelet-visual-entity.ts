import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { ROOT_PATH } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { IKameletDefinition, IKameletMetadata, IKameletSpec } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';

export class KameletVisualEntity extends AbstractCamelVisualEntity {
  id: string;
  readonly type = EntityType.Kamelet;
  spec: IKameletSpec;
  metadata: IKameletMetadata;

  constructor(kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, from: kamelet?.spec.template.from });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.metadata = kamelet?.metadata ?? { name: this.id };
    this.metadata.name = kamelet?.metadata.name ?? this.id;
    this.spec = kamelet.spec;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.metadata.name = this.id;
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === ROOT_PATH) {
      /** A better schema will be provided at a later stage */
      return {
        title: 'Kamelet',
        schema: {} as KaotoSchemaDefinition['schema'],
        definition: this.route,
      };
    }

    return super.getComponentSchema(path);
  }

  protected getRootUri(): string | undefined {
    return this.spec.template.from?.uri;
  }
}
