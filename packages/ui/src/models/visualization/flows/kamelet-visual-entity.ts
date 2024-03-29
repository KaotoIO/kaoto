import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { ROOT_PATH, getCustomSchemaFromKamelet, updateKameletFromCustomSchema } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';

export class KameletVisualEntity extends AbstractCamelVisualEntity {
  id: string;
  readonly type = EntityType.Kamelet;

  constructor(public kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, from: kamelet?.spec.template.from });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.kamelet.metadata = kamelet?.metadata ?? { name: this.id };
    this.kamelet.metadata.name = kamelet?.metadata.name ?? this.id;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.kamelet.metadata.name = this.id;
  }

  getId(): string {
    return this.kamelet.metadata.name;
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === ROOT_PATH) {
      return {
        title: 'Kamelet',
        schema: this.getRootKameletSchema(),
        definition: getCustomSchemaFromKamelet(this.kamelet),
      };
    }

    return super.getComponentSchema(path);
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (path === ROOT_PATH) {
      updateKameletFromCustomSchema(this.kamelet, value);
      this.id = this.kamelet.metadata.name;
      this.route.id = this.kamelet.metadata.name;
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
    return this.kamelet.spec.template.from?.uri;
  }
}
