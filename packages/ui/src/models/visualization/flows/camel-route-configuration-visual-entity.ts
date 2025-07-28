import { ProcessorDefinition, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import {
  BaseVisualCamelEntity,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
  VizNodesWithEdges,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { ModelValidationService } from './support/validators/model-validation.service';
import { CanvasEdge } from '../../../components/Visualization/Canvas';

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

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === this.getRootPath()) {
      const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'routeConfiguration');
      return {
        schema: schema?.propertiesSchema || {},
        definition: Object.assign({}, this.routeConfigurationDef.routeConfiguration),
      };
    }

    return super.getComponentSchema(path);
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

  getNodeValidationText(path?: string | undefined): string | undefined {
    const componentVisualSchema = this.getComponentSchema(path);
    if (!componentVisualSchema) return undefined;

    return ModelValidationService.validateNodeStatus(componentVisualSchema);
  }

  toVizNode(): VizNodesWithEdges {
    const routeConfigurationGroupNode = createVisualizationNode(this.id, {
      path: this.getRootPath(),
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.Entity),
      processorName: this.getRootPath(),
    });
    const edges: CanvasEdge[] = [];
    CamelComponentSchemaService.getProcessorStepsProperties(this.getRootPath() as keyof ProcessorDefinition).forEach(
      (stepsProperty) => {
        const childEntities = getValue(this.routeConfigurationDef.routeConfiguration, stepsProperty.name, []);
        if (!Array.isArray(childEntities)) return;
        const edges: CanvasEdge[] = [];

        childEntities.forEach((childEntity, index) => {
          const childNode = NodeMapperService.getVizNode(
            `${this.getRootPath()}.${stepsProperty.name}.${index}.${Object.keys(childEntity)[0]}`,
            {
              processorName: stepsProperty.name as keyof ProcessorDefinition,
            },
            this.routeConfigurationDef,
          );

          routeConfigurationGroupNode.addChild(childNode.nodes[0]);
          edges.push(...childNode.edges);
        });
      },
    );

    return { nodes: [routeConfigurationGroupNode], edges };
  }

  toJSON(): { routeConfiguration: RouteConfigurationDefinition } {
    return { routeConfiguration: this.routeConfigurationDef.routeConfiguration };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
