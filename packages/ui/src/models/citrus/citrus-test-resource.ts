import { isDefined } from '@kaoto/forms';

import { ITile, TileFilter } from '../../components/Catalog';
import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import { createCamelPropertiesSorter } from '../../utils';
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

export class CitrusTestResource implements CamelResource {
  static readonly SUPPORTED_ENTITIES: {
    type: EntityType;
    group: string;
    Entity: BaseVisualCamelEntityConstructor;
    isYamlOnly?: boolean;
  }[] = [{ type: EntityType.Test, group: '', Entity: CitrusTestVisualEntity }];
  static readonly PARAMETERS_ORDER = [
    'name',
    'author',
    'status',
    'description',
    'endpoints',
    'variables',
    'actions',
    'finally',
  ];
  readonly sortFn = createCamelPropertiesSorter(CitrusTestResource.PARAMETERS_ORDER) as (
    a: unknown,
    b: unknown,
  ) => number;
  private entities: BaseCamelEntity[] = [];
  private resolvedEntities: BaseVisualCamelEntityDefinition | undefined;

  constructor(
    rawEntities?: Test,
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
    const serializer = serializerType === 'XML' ? new XmlCamelResourceSerializer() : new YamlCamelResourceSerializer();

    serializer.setComments(this.serializer.getComments());
    serializer.setMetadata(this.serializer.getMetadata());

    this.serializer = serializer;
  }

  addNewEntity(entityType?: EntityType, entityTemplate?: unknown): string {
    if (entityType && entityType !== EntityType.Test) {
      const supportedEntity = CitrusTestResource.SUPPORTED_ENTITIES.find(({ type }) => type === entityType);
      if (supportedEntity) {
        const entity = new supportedEntity.Entity(entityTemplate);

        /** Error related entities should be added at the beginning of the list */
        if (EntityOrderingService.isRuntimePriorityEntity(entityType)) {
          this.entities.unshift(entity);
        } else {
          this.entities.push(entity);
        }
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
    return true;
  }

  getVisualEntities(): CitrusTestVisualEntity[] {
    return this.entities.filter(
      (entity) =>
        entity instanceof CitrusTestVisualEntity ||
        CitrusTestResource.SUPPORTED_ENTITIES.some(({ Entity }) => entity instanceof Entity),
    ) as CitrusTestVisualEntity[];
  }

  getEntities(): BaseCamelEntity[] {
    return this.entities.filter((entity) => !(entity instanceof CitrusTestVisualEntity)) as BaseCamelEntity[];
  }

  getVariables(): string[] {
    const test = this.toJSON() as Test;
    const declaredVariables = test.variables?.map((variable) => variable.name) || [];

    test.actions.forEach((action) => {
      if (isDefined(action.createVariables) && isDefined(action.createVariables.variables)) {
        declaredVariables.push(...action.createVariables.variables.map((variable) => variable.name));
      }
    });

    return declaredVariables;
  }

  toJSON(): unknown {
    if (this.entities && this.entities.length > 0) {
      return this.entities[0].toJSON();
    }

    return {};
  }

  toString() {
    return this.serializer.serialize(this);
  }

  removeEntity(ids?: string[]): void {
    if (!isDefined(ids)) return;
    this.entities = this.entities.filter((e) => !ids?.includes(e.id));
  }

  getCompatibleComponents(_mode: AddStepMode, _visualEntityData: IVisualizationNodeData): TileFilter {
    return (item: ITile) => {
      return item.type === CatalogKind.TestAction || item.type === CatalogKind.TestContainer;
    };
  }

  private getEntity(rawItem: unknown): BaseCamelEntity | undefined {
    if (!isDefined(rawItem) || Array.isArray(rawItem)) {
      return undefined;
    }

    for (const { Entity } of CitrusTestResource.SUPPORTED_ENTITIES) {
      if (Entity.isApplicable(rawItem)) {
        return new Entity(rawItem);
      }
    }

    return new NonVisualEntity(rawItem as string);
  }
}
