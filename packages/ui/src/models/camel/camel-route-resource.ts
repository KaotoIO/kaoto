import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { TileFilter } from '../../components/Catalog';
import { createCamelPropertiesSorter, isDefined } from '../../utils';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode, BaseVisualCamelEntityConstructor } from '../visualization/base-visual-entity';
import { CamelCatalogService, CamelRouteVisualEntity } from '../visualization/flows';
import { CamelErrorHandlerVisualEntity } from '../visualization/flows/camel-error-handler-visual-entity';
import { CamelInterceptFromVisualEntity } from '../visualization/flows/camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from '../visualization/flows/camel-intercept-send-to-endpoint-visual-entity';
import { CamelInterceptVisualEntity } from '../visualization/flows/camel-intercept-visual-entity';
import { CamelOnCompletionVisualEntity } from '../visualization/flows/camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from '../visualization/flows/camel-on-exception-visual-entity';
import { CamelRestConfigurationVisualEntity } from '../visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRouteConfigurationVisualEntity } from '../visualization/flows/camel-route-configuration-visual-entity';
import { NonVisualEntity } from '../visualization/flows/non-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { BeansEntity, isBeans } from '../visualization/metadata';
import { BaseVisualCamelEntityDefinition, BeansAwareResource, CamelResource } from './camel-resource';
import { BaseCamelEntity, EntityType } from './entities';
import { SourceSchemaType } from './source-schema-type';
import { CamelResourceSerializer } from '../../serializers/camel-resource-serializer';
import { YamlCamelResourceSerializer } from '../../serializers';

export class CamelRouteResource implements CamelResource, BeansAwareResource {
  static readonly SUPPORTED_ENTITIES: { type: EntityType; group: string; Entity: BaseVisualCamelEntityConstructor }[] =
    [
      { type: EntityType.Route, group: '', Entity: CamelRouteVisualEntity },
      { type: EntityType.RouteConfiguration, group: 'Configuration', Entity: CamelRouteConfigurationVisualEntity },
      { type: EntityType.Intercept, group: 'Configuration', Entity: CamelInterceptVisualEntity },
      { type: EntityType.InterceptFrom, group: 'Configuration', Entity: CamelInterceptFromVisualEntity },
      {
        type: EntityType.InterceptSendToEndpoint,
        group: 'Configuration',
        Entity: CamelInterceptSendToEndpointVisualEntity,
      },
      { type: EntityType.OnCompletion, group: 'Configuration', Entity: CamelOnCompletionVisualEntity },
      { type: EntityType.OnException, group: 'Error Handling', Entity: CamelOnExceptionVisualEntity },
      { type: EntityType.ErrorHandler, group: 'Error Handling', Entity: CamelErrorHandlerVisualEntity },
      { type: EntityType.RestConfiguration, group: 'Rest', Entity: CamelRestConfigurationVisualEntity },
    ];
  static readonly PARAMETERS_ORDER = ['id', 'description', 'uri', 'parameters', 'steps'];
  private static readonly ERROR_RELATED_ENTITIES = [EntityType.OnException, EntityType.ErrorHandler];
  readonly sortFn = createCamelPropertiesSorter(CamelRouteResource.PARAMETERS_ORDER) as (
    a: unknown,
    b: unknown,
  ) => number;
  private entities: BaseCamelEntity[] = [];
  private resolvedEntities: BaseVisualCamelEntityDefinition | undefined;
  private serializer: CamelResourceSerializer;

  constructor(code?: unknown, serializer?: CamelResourceSerializer) {
    this.serializer = serializer ?? new YamlCamelResourceSerializer();
    if (!code) return;

    const entities = Array.isArray(code) ? code : [code];
    this.entities = entities.reduce((acc, rawItem) => {
      const entity = this.getEntity(rawItem);
      if (isDefined(entity) && typeof entity === 'object') {
        acc.push(entity);
      }
      return acc;
    }, [] as BaseCamelEntity[]);
  }

  getCanvasEntityList(): BaseVisualCamelEntityDefinition {
    if (isDefined(this.resolvedEntities)) {
      return this.resolvedEntities;
    }

    this.resolvedEntities = CamelRouteResource.SUPPORTED_ENTITIES.reduce(
      (acc, { type, group }) => {
        const catalogEntity = CamelCatalogService.getComponent(CatalogKind.Entity, type);
        const entityDefinition = {
          name: type,
          title: catalogEntity?.model.title || type,
          description: catalogEntity?.model.description || '',
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

  getSerializer(): CamelResourceSerializer {
    return this.serializer;
  }
  setSerializer(serializer: CamelResourceSerializer): void {
    this.serializer = serializer;
  }

  addNewEntity(entityType?: EntityType): string {
    if (entityType && entityType !== EntityType.Route) {
      const supportedEntity = CamelRouteResource.SUPPORTED_ENTITIES.find(({ type }) => type === entityType);
      if (supportedEntity) {
        const entity = new supportedEntity.Entity();

        /** Error related entities should be added at the beginning of the list */
        if (CamelRouteResource.ERROR_RELATED_ENTITIES.includes(entityType)) {
          this.entities.unshift(entity);
        } else {
          this.entities.push(entity);
        }
        return entity.id;
      }
    }

    const template = FlowTemplateService.getFlowTemplate(this.getType());
    const route = template[0] as RouteDefinition;
    const entity = new CamelRouteVisualEntity(route);
    this.entities.push(entity);

    return entity.id;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Route;
  }

  supportsMultipleVisualEntities(): boolean {
    return true;
  }

  getVisualEntities(): CamelRouteVisualEntity[] {
    return this.entities.filter(
      (entity) =>
        entity instanceof CamelRouteVisualEntity ||
        CamelRouteResource.SUPPORTED_ENTITIES.some(({ Entity }) => entity instanceof Entity),
    ) as CamelRouteVisualEntity[];
  }

  getEntities(): BaseCamelEntity[] {
    return this.entities.filter((entity) => !(entity instanceof CamelRouteVisualEntity)) as BaseCamelEntity[];
  }

  toJSON(): unknown {
    return this.entities.map((entity) => entity.toJSON());
  }

  toString() {
    return this.serializer.serialize(this);
  }

  createBeansEntity(): BeansEntity {
    const newBeans = { beans: [] };
    const beansEntity = new BeansEntity(newBeans);
    this.entities.push(beansEntity);
    return beansEntity;
  }

  deleteBeansEntity(entity: BeansEntity): void {
    const index = this.entities.findIndex((e) => e === entity);
    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  removeEntity(id?: string): void {
    if (!isDefined(id)) return;
    const index: number = this.entities.findIndex((e) => e.id === id);

    if (index !== -1) {
      this.entities.splice(index, 1);
    }
  }

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    return CamelComponentFilterService.getCamelCompatibleComponents(mode, visualEntityData, definition);
  }

  private getEntity(rawItem: unknown): BaseCamelEntity | undefined {
    if (!isDefined(rawItem) || Array.isArray(rawItem)) {
      return undefined;
    }

    if (isBeans(rawItem)) {
      return new BeansEntity(rawItem);
    }

    for (const { Entity } of CamelRouteResource.SUPPORTED_ENTITIES) {
      if (Entity.isApplicable(rawItem)) {
        return new Entity(rawItem);
      }
    }

    return new NonVisualEntity(rawItem as string);
  }
}
