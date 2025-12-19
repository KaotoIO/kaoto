import { Rest } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getValue, setValue } from '../../../utils';
import { REST_DSL_VERBS, REST_ELEMENT_NAME } from '../../camel';
import { EntityType } from '../../camel/entities/base-entity';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
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
import { CamelComponentDefaultService } from './support/camel-component-default.service';

export class CamelRestVisualEntity extends AbstractCamelVisualEntity<{ rest: Rest }> implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Rest;
  static readonly ROOT_PATH = REST_ELEMENT_NAME;

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

    return (
      Object.keys(restDef).length === 1 &&
      this.ROOT_PATH in restDef &&
      'rest' in restDef &&
      typeof restDef.rest === 'object'
    );
  }

  getRootPath() {
    return CamelRestVisualEntity.ROOT_PATH;
  }

  setId(id: string): void {
    this.id = id;
  }

  getNodeSchema(path?: string): KaotoSchemaDefinition['schema'] | undefined {
    if (path === CamelRestVisualEntity.ROOT_PATH) {
      return CamelCatalogService.getComponent(CatalogKind.Entity, REST_ELEMENT_NAME)?.propertiesSchema ?? {};
    }

    /** If we're targetting a Rest method, the path would be `rest.get.0` */
    const pathSegments = path?.split('.') ?? [];
    const method = pathSegments[1] ?? '';
    if (pathSegments.length === 3 && REST_DSL_VERBS.includes(method)) {
      return CamelCatalogService.getComponent(CatalogKind.Pattern, method)?.propertiesSchema ?? {};
    }

    return super.getNodeSchema(path);
  }

  getNodeDefinition(path?: string): unknown {
    if (path === CamelRestVisualEntity.ROOT_PATH) {
      return { ...this.restDef.rest };
    }

    /** If we're targetting a Rest method, the path would be `rest.get.0` */
    const pathSegments = path?.split('.') ?? [];
    const method = pathSegments[1] ?? '';
    if (isDefined(path) && pathSegments.length === 3 && REST_DSL_VERBS.includes(method)) {
      return { ...getValue(this.restDef, path) };
    }

    return super.getNodeDefinition(path);
  }

  getOmitFormFields(): string[] {
    return REST_DSL_VERBS;
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.restDef, path, value);

    if (!isDefined(this.restDef.rest)) {
      this.restDef.rest = {};
    }
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string;
  }): void {
    /** Adding verbs for Rest: get, post, put, delete, patch, head */
    if (options.data.path === CamelRestVisualEntity.ROOT_PATH) {
      super.addStep(options);
      return;
    }

    /** Adding verbs for Rest: get, post, put, delete, patch, head */
    const defaultValue = CamelComponentDefaultService.getDefaultNodeDefinitionValue(options.definedComponent).to;
    const path = options.data.path?.replace('.placeholder', '');

    if (!path) return;
    setValue(this.entityDef, path, defaultValue);
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    if (data.path === CamelRestVisualEntity.ROOT_PATH) {
      return {
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: true,
        canRemoveStep: false,
        canReplaceStep: false,
        canRemoveFlow: true,
        canBeDisabled: true,
      };
    }

    if (data.path?.endsWith('to')) {
      return {
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: false,
        canRemoveStep: false,
        canReplaceStep: false,
        canRemoveFlow: false,
        canBeDisabled: false,
      };
    }

    return super.getNodeInteraction(data);
  }

  toVizNode(): IVisualizationNode<IVisualizationNodeData> {
    const restGroupNode = NodeMapperService.getVizNode(
      this.getRootPath(),
      { processorName: REST_ELEMENT_NAME },
      this.restDef,
    );
    restGroupNode.data.entity = this;
    restGroupNode.data.isGroup = true;
    restGroupNode.data.catalogKind = CatalogKind.Entity;
    restGroupNode.data.name = this.type;

    return restGroupNode;
  }

  toJSON(): { rest: Rest } {
    return { rest: this.restDef.rest };
  }

  protected getRootUri(): string | undefined {
    return undefined;
  }
}
