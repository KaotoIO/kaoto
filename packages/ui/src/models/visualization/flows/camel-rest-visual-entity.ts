import { ProcessorDefinition, Rest } from '@kaoto/camel-catalog/types';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { SchemaService } from '../../../components/Form/schema.service';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
} from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentFilterService } from './support/camel-component-filter.service';

export class CamelRestVisualEntity extends AbstractCamelVisualEntity<{ rest: Rest }> implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Rest;
  private static readonly ROOT_PATH = 'rest';
  private schemaValidator: ValidateFunction<Rest> | undefined;
  private readonly OMIT_FORM_FIELDS = [
    ...SchemaService.OMIT_FORM_FIELDS,
    'get',
    'post',
    'put',
    'delete',
    'head',
    'patch',
  ];

  constructor(public restDef: { rest: Rest } = { rest: {} }) {
    super(restDef);
    const id = restDef.rest.id ?? getCamelRandomId(CamelRestVisualEntity.ROOT_PATH);
    this.id = id;
    this.restDef.rest.id = id;
  }

  static isApplicable(restDef: unknown): restDef is { rest: Rest } {
    if (!isDefined(restDef) || Array.isArray(restDef) || typeof restDef !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(restDef!);

    return objectKeys.length === 1 && this.ROOT_PATH in restDef! && typeof restDef.rest === 'object';
  }

  getRootPath() {
    return CamelRestVisualEntity.ROOT_PATH;
  }

  setId(id: string): void {
    this.id = id;
  }

  getComponentSchema(path?: string): VisualComponentSchema | undefined {
    if (path === CamelRestVisualEntity.ROOT_PATH) {
      return {
        definition: Object.assign({}, this.restDef.rest),
        schema: CamelCatalogService.getComponent(CatalogKind.Entity, 'rest')?.propertiesSchema ?? {},
      };
    }

    /** If we're targetting a Rest method, the path would be `rest.get.0` */
    const method = path?.split('.')[1] ?? '';
    if (isDefined(path) && CamelComponentFilterService.REST_DSL_METHODS.includes(method)) {
      return {
        definition: Object.assign({}, getValue(this.restDef, path)),
        schema: CamelCatalogService.getComponent(CatalogKind.Pattern, method)?.propertiesSchema ?? {},
      };
    }

    return super.getComponentSchema(path);
  }

  getOmitFormFields(): string[] {
    return this.OMIT_FORM_FIELDS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.restDef, path, value);

    if (!isDefined(this.restDef.rest)) {
      this.restDef.rest = {};
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

    this.schemaValidator?.({ ...this.restDef.rest });

    return this.schemaValidator?.errors?.map((error) => `'${error.instancePath}' ${error.message}`).join(',\n');
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const restGroupNode = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: 'rest' as keyof ProcessorDefinition },
      this.restDef,
    );
    restGroupNode.data.entity = this;
    restGroupNode.data.isGroup = true;
    restGroupNode.data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.VisualEntity);

    return restGroupNode;
  }

  toJSON(): { rest: Rest } {
    return { rest: this.restDef.rest };
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
    return undefined;
  }
}
