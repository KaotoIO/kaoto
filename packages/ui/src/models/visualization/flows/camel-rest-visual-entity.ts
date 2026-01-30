import { Rest } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { getValue, setValue } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { DefinedComponent } from '../../camel-catalog-index';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { NodeLabelType } from '../../settings/settings.model';
import { REST_DSL_VERBS, REST_ELEMENT_NAME, SPECIAL_PROCESSORS_PARENTS_MAP } from '../../special-processors.constants';
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

export class CamelRestVisualEntity extends AbstractCamelVisualEntity<{ rest: Rest }> implements BaseVisualCamelEntity {
  id: string;
  readonly type = EntityType.Rest;
  static readonly ROOT_PATH = 'rest';
  private static readonly OMIT_FIELDS = [...REST_DSL_VERBS, 'uri'];

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

    return Object.keys(restDef).length === 1 && this.ROOT_PATH in restDef && typeof restDef.rest === 'object';
  }

  getNodeLabel(path?: string, labelType?: NodeLabelType): string {
    if (path === 'rest.placeholder') {
      return 'Add verb';
    }

    return super.getNodeLabel(path, labelType);
  }

  removeStep(path?: string): void {
    super.removeStep(path);

    const restVerbs = SPECIAL_PROCESSORS_PARENTS_MAP['rest'];
    for (const verb of restVerbs) {
      const verbArray = getValue(this.restDef.rest, verb);
      if (Array.isArray(verbArray) && verbArray.length === 0) {
        setValue(this.restDef.rest, verb, undefined);
      }
    }
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
    return CamelRestVisualEntity.OMIT_FIELDS;
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
    const path = options.data.path?.replace('.placeholder', '');
    const updatedOptions = { ...options, data: { ...options.data, path } };

    super.addStep(updatedOptions);
  }

  getNodeInteraction(data: IVisualizationNodeData): NodeInteraction {
    const isRootPath = data.path === CamelRestVisualEntity.ROOT_PATH;
    if (isRootPath || data.path?.endsWith('to')) {
      return {
        canHavePreviousStep: false,
        canHaveNextStep: false,
        canHaveChildren: false,
        canHaveSpecialChildren: isRootPath,
        canRemoveStep: !isRootPath,
        canReplaceStep: false,
        canRemoveFlow: isRootPath,
        canBeDisabled: isRootPath,
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
