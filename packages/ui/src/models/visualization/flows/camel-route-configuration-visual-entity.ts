import { ProcessorDefinition, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { SchemaService } from '../../../components/Form/schema.service';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { createVisualizationNode } from '../visualization-node';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { NodeMapperService } from './nodes/node-mapper.service';

export class CamelRouteConfigurationVisualEntity
  extends AbstractCamelVisualEntity<{ routeConfiguration: RouteConfigurationDefinition }>
  implements BaseVisualCamelEntity
{
  id: string;
  readonly type = EntityType.RouteConfiguration;
  private static readonly ROOT_PATH = 'routeConfiguration';
  private schemaValidator: ValidateFunction<RouteConfigurationDefinition> | undefined;
  private readonly OMIT_FORM_FIELDS = [
    ...SchemaService.OMIT_FORM_FIELDS,
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
    const id =
      routeConfigurationDef.routeConfiguration.id ?? getCamelRandomId(CamelRouteConfigurationVisualEntity.ROOT_PATH);
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

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getTooltipContent(path?: string): string {
    if (path === CamelRouteConfigurationVisualEntity.ROOT_PATH) {
      return 'routeConfiguration';
    }

    return super.getTooltipContent(path);
  }

  getComponentSchema(path?: string | undefined): VisualComponentSchema | undefined {
    if (path === CamelRouteConfigurationVisualEntity.ROOT_PATH) {
      const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'routeConfiguration');
      return {
        title: 'Route Configuration',
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
    if (data.path === CamelRouteConfigurationVisualEntity.ROOT_PATH) {
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

  getNodeValidationText(): string | undefined {
    const componentVisualSchema = this.getComponentSchema();
    if (!componentVisualSchema) return undefined;

    if (!this.schemaValidator) {
      this.schemaValidator = this.getValidatorFunction(componentVisualSchema.schema);
    }

    this.schemaValidator?.({ ...this.routeConfigurationDef.routeConfiguration });

    return this.schemaValidator?.errors?.map((error) => `'${error.instancePath}' ${error.message}`).join(',\n');
  }

  toVizNode(): IVisualizationNode {
    const routeConfigurationGroupNode = createVisualizationNode(this.id, {
      path: CamelRouteConfigurationVisualEntity.ROOT_PATH,
      entity: this,
      isGroup: true,
      icon: NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity),
      processorName: CamelRouteConfigurationVisualEntity.ROOT_PATH,
    });

    CamelComponentSchemaService.getProcessorStepsProperties(
      CamelRouteConfigurationVisualEntity.ROOT_PATH as keyof ProcessorDefinition,
    ).forEach((stepsProperty) => {
      const childEntities = getValue(this.routeConfigurationDef.routeConfiguration, stepsProperty.name, []);
      if (!Array.isArray(childEntities)) return;

      childEntities.forEach((childEntity, index) => {
        const childNode = NodeMapperService.getVizNode(
          `${CamelRouteConfigurationVisualEntity.ROOT_PATH}.${stepsProperty.name}.${index}.${
            Object.keys(childEntity)[0]
          }`,
          {
            processorName: stepsProperty.name as keyof ProcessorDefinition,
          },
          this.routeConfigurationDef,
        );

        routeConfigurationGroupNode.addChild(childNode);
      });
    });

    return routeConfigurationGroupNode;
  }

  toJSON(): { routeConfiguration: RouteConfigurationDefinition } {
    return { routeConfiguration: this.routeConfigurationDef.routeConfiguration };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }

  private getValidatorFunction(
    schema: KaotoSchemaDefinition['schema'],
  ): ValidateFunction<RouteConfigurationDefinition> | undefined {
    return undefined;
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      useDefaults: 'empty',
    });
    addFormats(ajv);

    let schemaValidator: ValidateFunction<RouteConfigurationDefinition> | undefined;
    try {
      schemaValidator = ajv.compile<RouteConfigurationDefinition>(schema);
    } catch (error) {
      console.error('Could not compile schema', error);
    }

    return schemaValidator;
  }
}
