import cloneDeep from 'lodash/cloneDeep';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { ROOT_PATH } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { IKameletDefinition, IKameletMetadata, IKameletSpec } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CatalogKind } from '../../catalog-kind';

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
      return {
        title: 'Kamelet',
        schema: this.getRootKameletSchema(),
        definition: this.route,
      };
    }

    return super.getComponentSchema(path);
  }

  private getRootKameletSchema(): KaotoSchemaDefinition['schema'] {
    const processorDefinition = CamelCatalogService.getComponent(CatalogKind.Entity, 'KameletConfiguration');

    if (processorDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (processorDefinition.propertiesSchema !== undefined) {
      schema = cloneDeep(processorDefinition.propertiesSchema);
    }

    return schema;
  }

  protected getRootUri(): string | undefined {
    return this.spec.template.from?.uri;
  }
}
