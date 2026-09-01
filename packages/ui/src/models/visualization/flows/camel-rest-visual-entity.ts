import { Rest } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { getValue, setValue } from '../../../utils';
import { uriDefinitionParser } from '../../camel/parsers/uri-definition.parser';
import { EntityType } from '../../entities/base-entity';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { REST_DSL_VERBS, RestMethods, SPECIAL_PROCESSORS_PARENTS_MAP } from '../../special-processors.constants';
import { IVisualizationNodeIds } from '../base-visual-entity';
import { RestEntity } from './rest-entity';

export class CamelRestVisualEntity implements RestEntity {
  id: string;
  readonly type = EntityType.Rest;
  static readonly ROOT_PATH = 'rest';

  constructor(public restDef: { rest: Rest } = { rest: {} }) {
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

  removeStep(path?: string): void {
    if (!path) return;

    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    if (Number.isInteger(Number(last))) {
      const array = getValue(this.restDef, pathArray.slice(0, -1), []);
      if (Array.isArray(array)) array.splice(Number(last), 1);
    } else if (Number.isInteger(Number(penultimate))) {
      const array = getValue(this.restDef, pathArray.slice(0, -2), []);
      if (Array.isArray(array)) array.splice(Number(penultimate), 1);
    } else {
      const object = getValue(this.restDef, pathArray.slice(0, -1), {});
      if (object && typeof object === 'object') delete object[last];
    }

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

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  async fetchNodeSchema(ids?: IVisualizationNodeIds): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    if (!ids?.primaryNodeId) {
      return;
    }

    const definition = await DynamicCatalogRegistry.get().getEntity(
      ids.primaryNodeId.catalogKind,
      ids.primaryNodeId.name,
    );
    return definition?.propertiesSchema;
  }

  getNodeDefinition(path?: string, _ids?: IVisualizationNodeIds): unknown {
    if (!path) return undefined;

    if (path === CamelRestVisualEntity.ROOT_PATH) {
      return { ...this.restDef.rest };
    }

    /** If we're targetting a Rest method, the path would be `rest.get.0` */
    const pathSegments = path?.split('.') ?? [];
    const method = (pathSegments[1] ?? '') as RestMethods;
    if (isDefined(path) && pathSegments.length === 3 && REST_DSL_VERBS.includes(method)) {
      return { ...getValue(this.restDef, path) };
    }

    return getValue(this.restDef, path);
  }

  async getParsedDefinition(path?: string, ids?: IVisualizationNodeIds): Promise<unknown> {
    const definition = this.getNodeDefinition(path, ids);
    if (definition == null) return definition;

    const componentName =
      ids?.secondaryNodeId?.name === 'kamelet' && ids?.tertiaryNodeId?.name !== undefined
        ? `kamelet:${ids.tertiaryNodeId.name}`
        : ids?.secondaryNodeId?.name;

    if (!componentName) return definition;

    return uriDefinitionParser(componentName, definition as Record<string, unknown>);
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.restDef, path, value);

    if (!isDefined(this.restDef.rest)) {
      this.restDef.rest = {};
    }
  }

  toJSON(): { rest: Rest } {
    return { rest: this.restDef.rest };
  }
}
