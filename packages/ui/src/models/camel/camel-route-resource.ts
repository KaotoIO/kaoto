/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CamelYamlDsl, RouteDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { TileFilter } from '../../components/Catalog';
import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
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
import { CamelRestVisualEntity } from '../visualization/flows/camel-rest-visual-entity';
import { CamelRouteConfigurationVisualEntity } from '../visualization/flows/camel-route-configuration-visual-entity';
import { NonVisualEntity } from '../visualization/flows/non-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import { BeansEntity, isBeans } from '../visualization/metadata';
import {
  BaseVisualCamelEntityDefinition,
  BeansAwareResource,
  CamelResource,
  CamelResourceSerializer,
  SerializerType,
} from './camel-resource';
import { BaseCamelEntity, EntityType } from './entities';
import { EntityOrderingService } from './entity-ordering.service';
import { SourceSchemaType } from './source-schema-type';

export class CamelRouteResource implements CamelResource, BeansAwareResource {
  static readonly SUPPORTED_ENTITIES: {
    type: EntityType;
    group: string;
    Entity: BaseVisualCamelEntityConstructor;
    isYamlOnly?: boolean;
  }[] = [
    { type: EntityType.Route, group: '', Entity: CamelRouteVisualEntity },
    { type: EntityType.RouteConfiguration, group: 'Configuration', Entity: CamelRouteConfigurationVisualEntity },
    { type: EntityType.Intercept, group: 'Configuration', Entity: CamelInterceptVisualEntity, isYamlOnly: true },
    {
      type: EntityType.InterceptFrom,
      group: 'Configuration',
      Entity: CamelInterceptFromVisualEntity,
      isYamlOnly: true,
    },
    {
      type: EntityType.InterceptSendToEndpoint,
      group: 'Configuration',
      Entity: CamelInterceptSendToEndpointVisualEntity,
      isYamlOnly: true,
    },
    { type: EntityType.OnCompletion, group: 'Configuration', Entity: CamelOnCompletionVisualEntity, isYamlOnly: true },
    { type: EntityType.OnException, group: 'Error Handling', Entity: CamelOnExceptionVisualEntity, isYamlOnly: true },
    { type: EntityType.ErrorHandler, group: 'Error Handling', Entity: CamelErrorHandlerVisualEntity, isYamlOnly: true },
    { type: EntityType.RestConfiguration, group: 'Rest', Entity: CamelRestConfigurationVisualEntity },
    { type: EntityType.Rest, group: 'Rest', Entity: CamelRestVisualEntity },
  ];
  private entities: BaseCamelEntity[] = [];
  private resolvedEntities: BaseVisualCamelEntityDefinition | undefined;

  constructor(
    rawEntities?: CamelYamlDsl,
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
    this.resolvedEntities = CamelRouteResource.SUPPORTED_ENTITIES.filter(
      ({ isYamlOnly }) =>
        this.serializer.getType() === SerializerType.YAML ||
        (this.serializer.getType() !== SerializerType.YAML && !isYamlOnly),
    ).reduce(
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

  addNewEntity(entityType?: EntityType, entityTemplate?: unknown, insertAfterEntityId?: string): string {
    if (entityType && entityType !== EntityType.Route) {
      const supportedEntity = CamelRouteResource.SUPPORTED_ENTITIES.find(({ type }) => type === entityType);
      if (supportedEntity) {
        const entity = new supportedEntity.Entity(entityTemplate);

        const insertIndex = this.getInsertionIndex(entityType, insertAfterEntityId);
        this.entities.splice(insertIndex, 0, entity);

        return entity.id;
      }
    }

    let route: RouteDefinition;
    if (entityTemplate) {
      route = entityTemplate as RouteDefinition;
    } else {
      const template = FlowTemplateService.getFlowTemplate(this.getType());
      route = template[0] as RouteDefinition;
    }
    const entity = new CamelRouteVisualEntity(route);

    const insertIndex = this.getInsertionIndex(EntityType.Route, insertAfterEntityId);
    this.entities.splice(insertIndex, 0, entity);

    return entity.id;
  }

  /**
   * Gets the insertion index for a new entity.
   * If `insertAfterEntityId` is provided, the new entity is placed right after the entity with that ID.
   * Otherwise, falls back to XML schema ordering via EntityOrderingService.
   */
  private getInsertionIndex(entityType: EntityType, insertAfterEntityId?: string): number {
    if (insertAfterEntityId) {
      const afterIndex = this.entities.findIndex((e) => e.id === insertAfterEntityId);
      if (afterIndex !== -1) {
        return afterIndex + 1;
      }
    }

    return EntityOrderingService.findInsertionIndex(this.entities, entityType);
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
    // Entities are already in correct order from addNewEntity() and constructor
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

  removeEntity(ids?: string[]): void {
    if (!isDefined(ids)) return;
    this.entities = this.entities.filter((e) => !ids?.includes(e.id));
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
