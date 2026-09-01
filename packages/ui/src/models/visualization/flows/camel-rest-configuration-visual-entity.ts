import { RestConfiguration } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { setValue } from '../../../utils';
import { EntityType } from '../../entities/base-entity';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { IVisualizationNodeIds } from '../base-visual-entity';
import { RestEntity } from './rest-entity';

export class CamelRestConfigurationVisualEntity implements RestEntity {
  id: string;
  readonly type = EntityType.RestConfiguration;
  static readonly ROOT_PATH = 'restConfiguration';

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
      this.ROOT_PATH in restConfigurationDef! &&
      typeof restConfigurationDef.restConfiguration === 'object'
    );
  }

  getRootPath(): string {
    return CamelRestConfigurationVisualEntity.ROOT_PATH;
  }

  getId(): string {
    return this.id;
  }

  setId(id: string): void {
    this.id = id;
  }

  removeStep(): void {
    return;
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

  getNodeDefinition(): unknown {
    return { ...this.restConfigurationDef.restConfiguration };
  }

  async getParsedDefinition(): Promise<unknown> {
    return this.getNodeDefinition();
  }

  updateModel(path: string | undefined, value: unknown): void {
    if (!path) return;

    setValue(this.restConfigurationDef, path, value);

    if (!isDefined(this.restConfigurationDef.restConfiguration)) {
      this.restConfigurationDef.restConfiguration = {};
    }
  }

  toJSON(): { restConfiguration: RestConfiguration } {
    return { restConfiguration: this.restConfigurationDef.restConfiguration };
  }
}
