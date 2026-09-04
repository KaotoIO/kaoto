import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { getCustomSchemaFromKamelet, setValue, updateKameletFromCustomSchema } from '../../../utils';
import { DefinedComponent } from '../../camel/camel-catalog-index';
import { IKameletDefinition, IKameletSpec } from '../../camel/kamelets-catalog';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { NodeLabelType } from '../../settings';
import { AddStepMode, IVisualizationNode, IVisualizationNodeData, IVisualizationNodeIds } from '../base-visual-entity';
import { IClipboardContent } from '../clipboard';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelComponentDefaultService } from './support/camel-component-default.service';

export class KameletVisualEntity extends AbstractCamelVisualEntity<{
  id: string;
  template: { route: RouteDefinition };
}> {
  id: string;
  readonly type = EntityType.Kamelet;
  static readonly ROOT_PATH = 'template.route';

  constructor(public kamelet: IKameletDefinition) {
    const { route, from, ...templateWithoutFrom } = kamelet.spec?.template ?? {};

    const spec: IKameletSpec = {
      ...kamelet.spec,
      template: {
        ...templateWithoutFrom,
        route: {
          ...route,
          from: {
            ...(from ?? route?.from),
          },
        },
      },
      definition: {
        ...kamelet.spec?.definition,
        title: kamelet.spec?.definition?.title,
        ...(kamelet.spec?.definition?.description ? { description: kamelet.spec?.definition?.description } : {}),
      },
    };
    super({ id: kamelet.metadata?.name, template: { route: spec.template.route } });
    this.id = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');
    this.kamelet.metadata = kamelet?.metadata ?? { name: this.id };
    this.kamelet.metadata.name = kamelet?.metadata.name ?? this.id;
    this.kamelet.spec = spec;
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

  getNodeLabel(path?: string, labelType?: NodeLabelType, ids?: IVisualizationNodeIds): string {
    if (path === this.getRootPath()) {
      const id: string | undefined = this.kamelet.metadata.name;
      const description: string | undefined = this.kamelet.spec.definition.description;

      if (labelType === NodeLabelType.Description && isDefined(description)) {
        return description;
      }

      return id;
    }

    return super.getNodeLabel(path, labelType, ids);
  }

  toJSON(): { route: RouteDefinition } {
    return { route: this.entityDef.template.route };
  }

  async fetchNodeSchema(ids: IVisualizationNodeIds): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    if (!ids?.primaryNodeId) {
      return;
    }

    if (ids.primaryNodeId.catalogKind === CatalogKind.Entity && ids.primaryNodeId.name === 'KameletConfiguration') {
      return await this.getRootKameletSchema();
    }

    return await super.fetchNodeSchema(ids);
  }

  async fetchNodeDefinition(path?: string, ids?: IVisualizationNodeIds): Promise<unknown> {
    if (path === this.getRootPath()) {
      return getCustomSchemaFromKamelet(this.kamelet);
    }

    return super.fetchNodeDefinition(path, ids);
  }

  getNodeDefinition(path?: string, ids?: IVisualizationNodeIds): unknown {
    if (path === this.getRootPath()) {
      return getCustomSchemaFromKamelet(this.kamelet);
    }

    return super.getNodeDefinition(path, ids);
  }

  getCopiedContent(path?: string, ids?: IVisualizationNodeIds): IClipboardContent | undefined {
    if (!path || !ids) return;

    const contentName = ids.primaryNodeId?.name;
    // Allow copying the entire kamelet entity
    if (path === this.getRootPath() && contentName === 'KameletConfiguration') {
      return { name: 'kamelet', definition: this.kamelet as object };
    }

    // For other paths, use the parent implementation
    return super.getCopiedContent(path, ids);
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
    targetProperty?: string;
  }): void {
    /** Replace the root `from` step */
    if (
      options.mode === AddStepMode.ReplaceStep &&
      options.data.path === `${this.getRootPath()}.from` &&
      isDefined(this.entityDef.template.route.from)
    ) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.entityDef.template.route.from, fromValue);
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

  async toVizNode(): Promise<IVisualizationNode> {
    const kameletGroupNode = await super.toVizNode();

    kameletGroupNode.data.primaryNodeId = {
      catalogKind: CatalogKind.Entity,
      name: 'KameletConfiguration',
    };

    return kameletGroupNode;
  }

  protected getRootUri(): string | undefined {
    return this.kamelet.spec.template.route.from.uri;
  }

  private async getRootKameletSchema(): Promise<KaotoSchemaDefinition['schema']> {
    const rootKameletDefinition = await DynamicCatalogRegistry.get().getEntity(
      CatalogKind.Entity,
      'KameletConfiguration',
    );

    if (rootKameletDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (rootKameletDefinition.propertiesSchema !== undefined) {
      schema = rootKameletDefinition.propertiesSchema;
    }

    return schema;
  }
}
