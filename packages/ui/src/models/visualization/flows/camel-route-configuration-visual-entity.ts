import { ProcessorDefinition, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getValue, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { NodeLabelType } from '../../settings/settings.model';
import { SPECIAL_PROCESSORS_PARENTS_MAP } from '../../special-processors.constants';
import {
  AddStepMode,
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
} from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';

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

    const objectKeys = Object.keys(routeConfigurationDef);

    return (
      objectKeys.length === 1 &&
      this.ROOT_PATH in routeConfigurationDef &&
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

  getNodeLabel(path?: string, labelType?: NodeLabelType): string {
    if (path === 'routeConfiguration.placeholder') {
      return 'Add configuration';
    }

    return super.getNodeLabel(path, labelType);
  }

  removeStep(path?: string): void {
    super.removeStep(path);

    const configProperties = SPECIAL_PROCESSORS_PARENTS_MAP['routeConfiguration'];
    for (const property of configProperties) {
      const propertyArray = getValue(this.routeConfigurationDef.routeConfiguration, property);
      if (Array.isArray(propertyArray) && propertyArray.length === 0) {
        setValue(this.routeConfigurationDef.routeConfiguration, property, undefined);
      }
    }
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

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }): void {
    const path = options.data.path?.replace('.placeholder', '');
    const updatedOptions = { ...options, data: { ...options.data, path } };

    super.addStep(updatedOptions);
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
    const routeConfigurationGroupNode = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: this.getRootPath() as keyof ProcessorDefinition },
      this.routeConfigurationDef,
    );
    routeConfigurationGroupNode.data.entity = this;
    routeConfigurationGroupNode.data.isGroup = true;
    routeConfigurationGroupNode.data.catalogKind = CatalogKind.Entity;
    routeConfigurationGroupNode.data.name = this.type;

    return routeConfigurationGroupNode;
  }

  toJSON(): { routeConfiguration: RouteConfigurationDefinition } {
    return { routeConfiguration: this.routeConfigurationDef.routeConfiguration };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
