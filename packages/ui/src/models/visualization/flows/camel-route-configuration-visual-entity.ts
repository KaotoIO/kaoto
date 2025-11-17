import { ProcessorDefinition, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getValue, isDefined, NodeIconResolver, NodeIconType, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

export class CamelRouteConfigurationVisualEntity
  extends AbstractCamelVisualEntity<{ routeConfiguration: RouteConfigurationDefinition }>
  implements BaseVisualCamelEntity
{
  id: string;
  readonly type = EntityType.RouteConfiguration;
  static readonly ROOT_PATH = 'routeConfiguration';
  private readonly OMIT_FORM_FIELDS = [
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onException',
    'onCompletion',
  ];

  constructor(
    public routeConfigurationDef: { routeConfiguration: RouteConfigurationDefinition } = { routeConfiguration: {} },
  ) {
    super(routeConfigurationDef);
    const id = routeConfigurationDef.routeConfiguration.id ?? getCamelRandomId(this.getRootPath());
    this.id = id;
    this.routeConfigurationDef.routeConfiguration.id = id;
  }

  static isApplicable(
    routeConfigurationDef: unknown,
  ): routeConfigurationDef is { routeConfiguration: RouteConfigurationDefinition } {
    if (
      !isDefined(routeConfigurationDef) ||
      Array.isArray(routeConfigurationDef) ||
      typeof routeConfigurationDef !== 'object'
    ) {
      return false;
    }

    const objectKeys = Object.keys(routeConfigurationDef!);

    return (
      objectKeys.length === 1 &&
      this.ROOT_PATH in routeConfigurationDef! &&
      typeof routeConfigurationDef.routeConfiguration === 'object'
    );
  }

  getRootPath(): string {
    return CamelRouteConfigurationVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getTooltipContent(path?: string): string {
    if (path === this.getRootPath()) {
      return 'routeConfiguration';
    }

    return super.getTooltipContent(path);
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (path === this.getRootPath()) {
      const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'routeConfiguration');
      return schema?.propertiesSchema ?? {};
    }

    return super.getNodeSchema(path);
  }

  getNodeDefinition(path?: string): unknown {
    if (path === this.getRootPath()) {
      return { ...this.routeConfigurationDef.routeConfiguration };
    }

    return super.getNodeDefinition(path);
  }

  getOmitFormFields(): string[] {
    return this.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.routeConfigurationDef, path, value);

    if (!isDefined(this.routeConfigurationDef.routeConfiguration)) {
      this.routeConfigurationDef.routeConfiguration = {};
    }
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    if (data.path === this.getRootPath()) {
      return {
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: true,
        canRemoveStep: false,
        canReplaceStep: false,
        canRemoveFlow: true,
        canBeDisabled: false,
      };
    }

    return super.getNodeInteraction(data);
  }

  toVizNode(): IVisualizationNode {
    const routeConfigurationGroupNode = createVisualizationNode(this.id, {
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.Entity),
      processorName: this.getRootPath(),
    });

    CamelComponentSchemaService.getProcessorStepsProperties(this.getRootPath() as keyof ProcessorDefinition).forEach(
      (stepsProperty) => {
        const childEntities = getValue(this.routeConfigurationDef.routeConfiguration, stepsProperty.name, []);
        if (!Array.isArray(childEntities)) return;

        childEntities.forEach((childEntity, index) => {
          const childNode = NodeMapperService.getVizNode(
            `${this.getRootPath()}.${stepsProperty.name}.${index}.${Object.keys(childEntity)[0]}`,
            {
              processorName: stepsProperty.name as keyof ProcessorDefinition,
            },
            this.routeConfigurationDef,
          );

          routeConfigurationGroupNode.addChild(childNode);
        });
      },
    );

    return routeConfigurationGroupNode;
  }

  toJSON(): { routeConfiguration: RouteConfigurationDefinition } {
    return { routeConfiguration: this.routeConfigurationDef.routeConfiguration };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
