import { isDefined } from '@kaoto/forms';

import { ITile, TileFilter } from '../../components/Catalog';
import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import {
  BaseVisualCamelEntityDefinition,
  CamelResource,
  CamelResourceSerializer,
  SerializerType,
} from '../camel/camel-resource';
import { BaseCamelEntity, EntityType } from '../camel/entities';
import { EntityOrderingService } from '../camel/entity-ordering.service';
import { SourceSchemaType } from '../camel/source-schema-type';
import { CatalogKind } from '../catalog-kind';
import {
  AddStepMode,
  BaseVisualCamelEntityConstructor,
  IVisualizationNodeData,
} from '../visualization/base-visual-entity';
import { CamelCatalogService, CitrusTestVisualEntity } from '../visualization/flows';
import { NonVisualEntity } from '../visualization/flows/non-visual-entity';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { Test } from './entities/Test';

/**
 * Represents a Citrus test resource in the Kaoto visual editor.
 *
 * This class implements the CamelResource interface to provide integration between
 * Citrus test definitions and the Kaoto visual editor. It manages the lifecycle of
 * Citrus test entities, handles serialization/deserialization, and provides methods
 * for manipulating test structure in the visual canvas.
 *
 * Key responsibilities:
 * - Parse and manage Citrus test entities
 * - Provide visual entity definitions for the canvas
 * - Handle test action addition, removal, and updates
 * - Serialize tests to YAML/XML format
 * - Filter compatible components for the catalog
 */
export class CitrusTestResource implements CamelResource {
  static readonly SUPPORTED_ENTITIES: {
    type: EntityType;
    group: string;
    Entity: BaseVisualCamelEntityConstructor;
    isYamlOnly?: boolean;
  }[] = [{ type: EntityType.Test, group: '', Entity: CitrusTestVisualEntity }];
  private entities: BaseCamelEntity[] = [];
  private resolvedEntities: BaseVisualCamelEntityDefinition | undefined;

  /**
   * Creates a new CitrusTestResource instance.
   *
   * @param rawEntities - Raw test definition(s) to parse into entities
   * @param serializer - Serializer for converting between object and string representations (defaults to YAML)
   */
  constructor(
    rawEntities?: Test | Test[],
    private serializer: CamelResourceSerializer = new YamlCamelResourceSerializer(),
  ) {
    if (!rawEntities) return;

    const entities = Array.isArray(rawEntities) ? rawEntities : [rawEntities];
    const parsedEntities = entities.reduce((acc, rawItem) => {
      const entity = this.getEntity(rawItem);
      if (isDefined(entity) && typeof entity === 'object') {
        acc.push(entity);
      }
      return acc;
    }, [] as BaseCamelEntity[]);

    this.entities = EntityOrderingService.sortEntitiesForSerialization(parsedEntities);
  }

  /**
   * Gets the list of entity types that can be added to the canvas.
   *
   * Filters entities based on the current serializer type (some entities are YAML-only).
   * Returns entity definitions organized into common entities and grouped entities.
   *
   * @returns Entity definitions with metadata for display in the visual editor
   */
  getCanvasEntityList(): BaseVisualCamelEntityDefinition {
    this.resolvedEntities = CitrusTestResource.SUPPORTED_ENTITIES.filter(
      ({ isYamlOnly }) =>
        this.serializer.getType() === SerializerType.YAML ||
        (this.serializer.getType() !== SerializerType.YAML && !isYamlOnly),
    ).reduce(
      (acc, { type, group }) => {
        const catalogEntity = CamelCatalogService.getComponent(CatalogKind.TestAction, type);
        const entityDefinition = {
          name: type,
          title: catalogEntity?.title || type,
          description: catalogEntity?.description || '',
        };

        if (group === '') {
          acc.common.push(entityDefinition);
          return acc;
        }

        acc.groups[group] ??= [];
        acc.groups[group].push(entityDefinition);
        return acc;
      },
      { common: [], groups: {} } as BaseVisualCamelEntityDefinition,
    );

    return this.resolvedEntities;
  }

  getSerializerType() {
    return this.serializer.getType();
  }

  setSerializer(serializerType: SerializerType): void {
    // Preserve comments
    const serializer =
      serializerType === SerializerType.XML ? new XmlCamelResourceSerializer() : new YamlCamelResourceSerializer();

    serializer.setComments(this.serializer.getComments());
    serializer.setMetadata(this.serializer.getMetadata());

    this.serializer = serializer;
  }

  /**
   * Adds a new entity to this resource.
   *
   * @param entityType - The type of entity to add (defaults to Test if not specified)
   * @param entityTemplate - Optional template/initial data for the entity
   * @returns The ID of the newly created entity
   */
  addNewEntity(entityType?: EntityType, entityTemplate?: unknown): string {
    if (entityType && entityType !== EntityType.Test) {
      const supportedEntity = CitrusTestResource.SUPPORTED_ENTITIES.find(({ type }) => type === entityType);
      if (supportedEntity) {
        const entity = new supportedEntity.Entity(entityTemplate);

        this.entities.push(entity);

        return entity.id;
      }
    }

    let test: Test;
    if (entityTemplate) {
      test = entityTemplate as Test;
    } else {
      const template = FlowTemplateService.getFlowTemplate(this.getType());
      test = template[0] as Test;
    }
    const entity = new CitrusTestVisualEntity(test);
    this.entities.push(entity);

    return entity.id;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Test;
  }

  supportsMultipleVisualEntities(): boolean {
    return false;
  }

  /**
   * Gets all visual entities (CitrusTestVisualEntity instances) from this resource.
   */
  getVisualEntities(): CitrusTestVisualEntity[] {
    return this.entities.filter(
      (entity) =>
        entity instanceof CitrusTestVisualEntity ||
        CitrusTestResource.SUPPORTED_ENTITIES.some(({ Entity }) => entity instanceof Entity),
    ) as CitrusTestVisualEntity[];
  }

  /**
   * Gets all non-visual entities from this resource.
   */
  getEntities(): BaseCamelEntity[] {
    return this.entities.filter((entity) => !(entity instanceof CitrusTestVisualEntity)) as BaseCamelEntity[];
  }

  /**
   * Converts this resource to a JSON representation.
   * Returns the JSON representation of the first entity only or an empty object if no entities exist.
   */
  toJSON(): unknown {
    if (this.entities && this.entities.length > 0) {
      return this.entities[0].toJSON();
    }

    return {};
  }

  /**
   * Converts this resource to a string representation using the configured serializer.
   */
  toString() {
    return this.serializer.serialize(this);
  }

  /**
   * Removes entities with the specified IDs from this resource.
   *
   * @param ids - Array of entity IDs to remove
   */
  removeEntity(ids?: string[]): void {
    if (!isDefined(ids)) return;
    this.entities = this.entities.filter((e) => !ids?.includes(e.id));
  }

  /**
   * Gets a filter function for determining which catalog components are compatible
   * with this resource type.
   *
   * @param _mode - The add step mode (unused for Citrus tests)
   * @param _visualEntityData - The visualization node data (unused for Citrus tests)
   * @returns A filter function that accepts test actions and containers
   */
  getCompatibleComponents(_mode: AddStepMode, _visualEntityData: IVisualizationNodeData): TileFilter {
    return (item: ITile) => {
      return item.type === CatalogKind.TestAction || item.type === CatalogKind.TestContainer;
    };
  }

  /**
   * Converts a raw item to a BaseCamelEntity.
   *
   * Attempts to match the raw item against supported entity types.
   * If no match is found, wraps it in a NonVisualEntity.
   *
   * @param rawItem - The raw item to convert
   * @returns A BaseCamelEntity instance or undefined if the item is invalid
   */
  private getEntity(rawItem: unknown): BaseCamelEntity | undefined {
    if (!isDefined(rawItem) || Array.isArray(rawItem)) {
      return undefined;
    }

    for (const { Entity } of CitrusTestResource.SUPPORTED_ENTITIES) {
      if (Entity.isApplicable(rawItem)) {
        return new Entity(rawItem);
      }
    }

    return new NonVisualEntity(rawItem);
  }
}
