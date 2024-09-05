import { ProcessorDefinition, RestConfiguration } from '@kaoto/camel-catalog/types';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { SchemaService } from '../../../components/Form/schema.service';
import { NodeIconResolver, NodeIconType, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';

export class CamelRestConfigurationVisualEntity implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.RestConfiguration;
  private schemaValidator: ValidateFunction<RestConfiguration> | undefined;

  constructor(public restConfigurationDef: { restConfiguration: RestConfiguration } = { restConfiguration: {} }) {
    const id = getCamelRandomId('restConfiguration');
    this.id = id;
  }

  static isApplicable(restConfigurationDef: unknown): restConfigurationDef is { restConfiguration: RestConfiguration } {
    if (
      !isDefined(restConfigurationDef) ||
      Array.isArray(restConfigurationDef) ||
      typeof restConfigurationDef !== 'object'
    ) {
      return false;
    }

    const objectKeys = Object.keys(restConfigurationDef!);

    return (
      objectKeys.length === 1 &&
      'restConfiguration' in restConfigurationDef! &&
      typeof restConfigurationDef.restConfiguration === 'object'
    );
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getNodeLabel(): string {
    return 'restConfiguration';
  }

  getTooltipContent(): string {
    return 'restConfiguration';
  }

  addStep(): void {
    return;
  }

  removeStep(): void {
    return;
  }

  getComponentSchema(): VisualComponentSchema {
    const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'restConfiguration');

    return {
      definition: Object.assign({}, this.restConfigurationDef.restConfiguration),
      schema: schema?.propertiesSchema || {},
      title: 'Rest Configuration',
    };
  }

  getOmitFormFields(): string[] {
    return SchemaService.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.restConfigurationDef, path, value);

    if (!isDefined(this.restConfigurationDef.restConfiguration)) {
      this.restConfigurationDef.restConfiguration = {};
    }
  }

  getNodeInteraction(): NodeInteraction {
    return {
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: false,
    };
  }

  getNodeValidationText(): string | undefined {
    const componentVisualSchema = this.getComponentSchema();
    if (!componentVisualSchema) return undefined;

    if (!this.schemaValidator) {
      this.schemaValidator = this.getValidatorFunction(componentVisualSchema);
    }

    this.schemaValidator?.({ ...this.restConfigurationDef.restConfiguration });

    return this.schemaValidator?.errors?.map((error) => `'${error.instancePath}' ${error.message}`).join(',\n');
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const restConfigurationGroupNode = NodeMapperService.getVizNode(
      'restConfiguration',
      { processorName: 'restConfiguration' as keyof ProcessorDefinition },
      this.restConfigurationDef,
    );
    restConfigurationGroupNode.data.entity = this;
    restConfigurationGroupNode.data.isGroup = true;
    restConfigurationGroupNode.data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity);

    return restConfigurationGroupNode;
  }

  toJSON(): unknown {
    return this.restConfigurationDef;
  }

  private getValidatorFunction(
    componentVisualSchema: VisualComponentSchema,
  ): ValidateFunction<RestConfiguration> | undefined {
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      useDefaults: 'empty',
    });
    addFormats(ajv);

    let schemaValidator: ValidateFunction<RestConfiguration> | undefined;
    try {
      schemaValidator = ajv.compile<RestConfiguration>(componentVisualSchema.schema);
    } catch (error) {
      console.error('Could not compile schema', error);
    }

    return schemaValidator;
  }
}
