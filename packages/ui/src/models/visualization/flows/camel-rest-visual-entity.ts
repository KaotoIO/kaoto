import { ProcessorDefinition, Rest } from '@kaoto/camel-catalog/types';
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
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';

export class CamelRestVisualEntity extends AbstractCamelVisualEntity<{ rest: Rest }> implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Rest;
  private schemaValidator: ValidateFunction<Rest> | undefined;

  constructor(public rest: { rest: Rest }) {
    super(rest);
    const id = getCamelRandomId('rest');
    this.id = id;
  }

  static isApplicable(restDef: unknown): restDef is { rest: Rest } {
    if (!isDefined(restDef) || Array.isArray(restDef) || typeof restDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(restDef!);

    return objectKeys.length === 1 && 'rest' in restDef! && typeof restDef.rest === 'object';
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  getNodeLabel(): string {
    return 'rest';
  }

  getTooltipContent(): string {
    return 'rest';
  }

  addStep(): void {
    return;
  }

  removeStep(): void {
    return;
  }

  getComponentSchema(): VisualComponentSchema {
    const schema = CamelCatalogService.getComponent(CatalogKind.Entity, 'rest');

    return {
      definition: Object.assign({}, this.rest),
      schema: schema?.propertiesSchema || {},
    };
  }

  getOmitFormFields(): string[] {
    return SchemaService.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.rest, path, value);

    if (!isDefined(this.rest)) {
      this.rest = {rest: Rest};
    }
  }

  getNodeInteraction(): NodeInteraction {
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

  getNodeValidationText(): string | undefined {
    const componentVisualSchema = this.getComponentSchema();
    if (!componentVisualSchema) return undefined;

    if (!this.schemaValidator) {
      this.schemaValidator = this.getValidatorFunction(componentVisualSchema);
    }

    this.schemaValidator?.({ ...this.rest });

    return this.schemaValidator?.errors?.map((error) => `'${error.instancePath}' ${error.message}`).join(',\n');
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const restGroupNode = NodeMapperService.getVizNode(
      'rest',
      { processorName: 'rest' as keyof ProcessorDefinition },
      this.rest,
    );
    restGroupNode.data.entity = this;
    restGroupNode.data.isGroup = true;
    restGroupNode.data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity);
    restGroupNode.setTitle('REST');

    return restGroupNode;
  }

  toJSON(): { rest: Rest } {
    return { rest: this.rest };
  }

  private getValidatorFunction(componentVisualSchema: VisualComponentSchema): ValidateFunction<Rest> | undefined {
    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      useDefaults: 'empty',
    });
    addFormats(ajv);

    let schemaValidator: ValidateFunction<Rest> | undefined;
    try {
      schemaValidator = ajv.compile<Rest>(componentVisualSchema.schema);
    } catch (error) {
      console.error('Could not compile schema', error);
    }

    return schemaValidator;
  }

  protected getRootUri(): string | undefined {
    return this.rest.rest;
  }
}
