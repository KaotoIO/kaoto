import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import {
  ROOT_PATH,
  getCustomSchemaFromActualKameletSchema,
  getActualKameletSchemaFromCustomSchema,
} from '../../../utils';
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

  constructor(public kamelet: IKameletDefinition) {
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

  getId(): string {
    return this.metadata.name;
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === ROOT_PATH) {
      return {
        title: 'Kamelet',
        schema: this.getRootKameletSchema(),
        definition: getCustomSchemaFromActualKameletSchema(this.kamelet),
      };
    }

    return super.getComponentSchema(path);
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (!path) return;

    if (path === ROOT_PATH) {
      getActualKameletSchemaFromCustomSchema(this.kamelet, value);
      return;
    }

    super.updateModel(path, value);
  }

  private getRootKameletSchema(): KaotoSchemaDefinition['schema'] {
    const rootKameletDefinition = CamelCatalogService.getComponent(CatalogKind.Entity, 'KameletConfiguration');

    if (rootKameletDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (rootKameletDefinition.propertiesSchema !== undefined) {
      schema = rootKameletDefinition.propertiesSchema;
    }

    return schema;
  }

  protected getRootUri(): string | undefined {
    return this.spec.template.from?.uri;
  }
}
