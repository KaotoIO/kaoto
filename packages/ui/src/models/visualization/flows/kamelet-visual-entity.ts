import { FromDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getCustomSchemaFromKamelet, isDefined, setValue, updateKameletFromCustomSchema } from '../../../utils';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { IKameletDefinition } from '../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { AddStepMode, IVisualizationNode, IVisualizationNodeData, VisualComponentSchema } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelComponentDefaultService } from './support/camel-component-default.service';
import { NodeLabelType } from '../../settings';

export class KameletVisualEntity extends AbstractCamelVisualEntity<{ id: string; template: { from: FromDefinition } }> {
  id: string;
  readonly type = EntityType.Kamelet;
  static readonly ROOT_PATH = 'template';

  constructor(public kamelet: IKameletDefinition) {
    super({ id: kamelet.metadata?.name, template: { from: kamelet?.spec.template.from } });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.kamelet.metadata = kamelet?.metadata ?? { name: this.id };
    this.kamelet.metadata.name = kamelet?.metadata.name ?? this.id;
  }

  getRootPath(): string {
    return KameletVisualEntity.ROOT_PATH;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.kamelet.metadata.name = this.id;
  }

  getId(): string {
    return this.kamelet.metadata.name;
  }

  getNodeLabel(path?: string, labelType?: NodeLabelType): string {
    if (path === this.getRootPath()) {
      return this.kamelet.metadata.name;
    }

    return super.getNodeLabel(path, labelType);
  }

  toJSON(): { from: FromDefinition } {
    return { from: this.entityDef.template.from };
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === this.getRootPath()) {
      return {
        schema: this.getRootKameletSchema(),
        definition: getCustomSchemaFromKamelet(this.kamelet),
      };
    }

    return super.getComponentSchema(path);
  }

  updateModel(path: string | undefined, value: Record<string, unknown>): void {
    if (path === this.getRootPath()) {
      updateKameletFromCustomSchema(this.kamelet, value);
      this.id = this.kamelet.metadata.name;
      this.entityDef.id = this.kamelet.metadata.name;
      return;
    }

    super.updateModel(path, value);
    if (isDefined(this.entityDef.id)) this.id = this.entityDef.id;
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string | undefined;
  }): void {
    /** Replace the root `from` step */
    if (
      options.mode === AddStepMode.ReplaceStep &&
      options.data.path === `${this.getRootPath()}.from` &&
      isDefined(this.entityDef.template.from)
    ) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.entityDef.template.from, fromValue);
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
    if (path === `${this.getRootPath()}.from`) {
      setValue(this.entityDef, `${this.getRootPath()}.from.uri`, '');
      return;
    }

    super.removeStep(path);
  }

  toVizNode(): IVisualizationNode {
    const vizNode = super.toVizNode();
    vizNode.setTitle('Kamelet');

    return vizNode;
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
