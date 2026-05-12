import { ProcessorDefinition, RestConfiguration } from '@kaoto/camel-catalog/types';
import { getValidator, isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { setValue } from '../../../utils';
import { SourceSchemaType } from '../../camel/source-schema-type';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities/base-entity';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { BaseVisualEntity, IVisualizationNode, IVisualizationNodeData, NodeInteraction } from '../base-visual-entity';
import { IClipboardCopyObject } from '../clipboard';
import { createVisualizationNode } from '../visualization-node';
import { NodeEnrichmentService } from './nodes/node-enrichment.service';

export class CamelRestConfigurationVisualEntity implements BaseVisualEntity {
  id: string;
  readonly type = EntityType.RestConfiguration;
  static readonly ROOT_PATH = 'restConfiguration';
  private schemaValidator: ReturnType<typeof getValidator>;

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

    const objectKeys = Object.keys(restConfigurationDef);

    return (
      objectKeys.length === 1 &&
      this.ROOT_PATH in restConfigurationDef &&
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

  getNodeLabel(): string {
    return 'restConfiguration';
  }

  addStep(): void {
    return;
  }

  getCopiedContent(): IClipboardCopyObject | undefined {
    return {
      type: SourceSchemaType.Route,
      name: CamelRestConfigurationVisualEntity.ROOT_PATH,
      definition: this.restConfigurationDef.restConfiguration,
    };
  }

  pasteStep(): void {
    return;
  }

  canDragNode(_path?: string) {
    return false;
  }

  canDropOnNode(_path?: string) {
    return false;
  }

  removeStep(): void {
    return;
  }

  async getNodeSchema(): Promise<KaotoSchemaDefinition['schema'] | undefined> {
    const schema = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'restConfiguration');
    return schema?.propertiesSchema ?? {};
  }

  getNodeDefinition(): unknown {
    return { ...this.restConfigurationDef.restConfiguration };
  }

  getOmitFormFields(): string[] {
    return [];
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

  async getNodeValidationText(): Promise<string | undefined> {
    const schema = await this.getNodeSchema();
    if (!schema) return undefined;

    this.schemaValidator ??= getValidator<RestConfiguration>(schema, { useDefaults: 'empty' });

    this.schemaValidator?.({ ...this.restConfigurationDef.restConfiguration });

    return this.schemaValidator?.errors?.map((error) => `'${error.instancePath}' ${error.message}`).join(',\n');
  }

  async toVizNode(): Promise<IVisualizationNode<IVisualizationNodeData>> {
    const restConfigurationGroupNode = createVisualizationNode(this.getRootPath(), {
      name: this.type,
      path: this.getRootPath(),
      entity: this,
      isPlaceholder: false,
      isGroup: true,
      iconUrl: '',
      title: '',
      description: '',
      processorIconTooltip: '',
      processorName: 'restConfiguration' as keyof ProcessorDefinition,
    });

    // Enrich as Entity (not Processor) to get proper title formatting
    await NodeEnrichmentService.enrichNodeFromCatalog(restConfigurationGroupNode, CatalogKind.Entity);

    return restConfigurationGroupNode;
  }

  toJSON(): { restConfiguration: RestConfiguration } {
    return { restConfiguration: this.restConfigurationDef.restConfiguration };
  }
}
