import { ProcessorDefinition, Rest } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { NodeIconResolver, NodeIconType, getValue, isDefined, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import {
  BaseVisualCamelEntity,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeInteraction,
  VisualComponentSchema,
  VizNodesWithEdges,
} from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { NodeMapperService } from './nodes/node-mapper.service';
import { CamelComponentFilterService } from './support/camel-component-filter.service';

export class CamelRestVisualEntity extends AbstractCamelVisualEntity<{ rest: Rest }> implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Rest;
  static readonly ROOT_PATH = 'rest';
  private readonly OMIT_FORM_FIELDS = ['get', 'post', 'put', 'delete', 'head', 'patch'];

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
      /** Replace it with `true` when enabling the methods (GET, POST, PUT) */
      canHaveSpecialChildren: false,
      canRemoveStep: false,
      canReplaceStep: false,
      canRemoveFlow: true,
      canBeDisabled: true,
    };
  }

  getNodeValidationText(): string | undefined {
    return undefined;
  }

  toVizNode(): VizNodesWithEdges {
    const { nodes: restGroupNode } = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: 'rest' as keyof ProcessorDefinition },
      this.restDef,
    );
    restGroupNode[0].data.entity = this;
    restGroupNode[0].data.isGroup = true;
    restGroupNode[0].data.icon = NodeIconResolver.getIcon(this.type, NodeIconType.Entity);

    return restGroupNode;
  }

  toJSON(): { rest: Rest } {
    return { rest: this.restDef.rest };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
