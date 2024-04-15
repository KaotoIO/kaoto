import { RouteDefinition } from '@kaoto-next/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import {
  ROOT_PATH,
  getCustomSchemaFromKamelet,
  isDefined,
  setValue,
  updateKameletFromCustomSchema,
} from '../../../utils';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { AddStepMode, IVisualizationNodeData, VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelComponentDefaultService } from './support/camel-component-default.service';

export class KameletVisualEntity extends AbstractCamelVisualEntity<RouteDefinition> {
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

  toJSON(): { route: RouteDefinition } {
    return { route: this.route };
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
    if (isDefined(this.route.id)) this.id = this.route.id;
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string | undefined;
  }): void {
    /** Replace the root `from` step */
    if (options.mode === AddStepMode.ReplaceStep && options.data.path === 'from' && isDefined(this.route.from)) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.route.from, fromValue);
      return;
    }

    super.addStep(options);
  }

  removeStep(path?: string): void {
    if (!path) return;
    /**
     * If there's only one path segment, it means the target is the `from` property of the route
     * therefore we replace it with an empty object
     */
    if (path === 'from') {
      setValue(this.route, 'from.uri', '');
      return;
    }

    super.removeStep(path);
  }

  protected getRootUri(): string | undefined {
    return this.kamelet.spec.template.from?.uri;
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
}
