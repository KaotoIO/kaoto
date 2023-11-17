import { RouteDefinition } from '@kaoto-next/camel-catalog/types';
import { ITile, TileFilter } from '../../components/Catalog';
import { isDefined } from '../../utils';
import { CatalogKind } from '../catalog-kind';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelRouteVisualEntity, isCamelRoute } from '../visualization/flows';
import { flowTemplateService } from '../visualization/flows/flow-templates-service';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { BeansEntity, isBeans } from '../visualization/metadata';
import { BeansAwareResource, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { SourceSchemaType } from './source-schema-type';

export class CamelRouteResource implements CamelResource, BeansAwareResource {
  private entities: BaseCamelEntity[] = [];

  constructor(json?: unknown) {
    if (!json) return;
    const rawEntities = Array.isArray(json) ? json : [json];
    this.entities = rawEntities.reduce((acc, rawItem) => {
      const entity = this.getEntity(rawItem);
      if (isDefined(entity) && typeof entity === 'object') {
        acc.push(entity);
      }
      return acc;
    }, [] as BaseCamelEntity[]);
  }

  addNewEntity(_entity?: unknown): string {
    const template = flowTemplateService.getFlowTemplate(this.getType());
    const route = template[0].route as Partial<RouteDefinition>;
    const visualEntity = new CamelRouteVisualEntity(route);
    this.entities.push(visualEntity);

    return visualEntity.id;
  }

  getEntity(rawItem: unknown): BaseCamelEntity | undefined {
    if (!isDefined(rawItem) || Array.isArray(rawItem)) {
      return undefined;
    }
    if (isCamelRoute(rawItem)) {
      return new CamelRouteVisualEntity(rawItem.route);
    } else if (isBeans(rawItem)) {
      return new BeansEntity(rawItem);
    }
    return rawItem as BaseCamelEntity;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Route;
  }

  supportsMultipleVisualEntities(): boolean {
    return true;
  }

  getVisualEntities(): CamelRouteVisualEntity[] {
    return this.entities.filter((entity) => entity instanceof CamelRouteVisualEntity) as CamelRouteVisualEntity[];
  }

  getEntities(): BaseCamelEntity[] {
    return this.entities.filter((entity) => !(entity instanceof CamelRouteVisualEntity)) as BaseCamelEntity[];
  }

  toJSON(): unknown {
    return this.entities.map((entity) => entity.toJSON());
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
    const index: number = this.entities.findIndex((e) => e.id === id);

    if (index !== -1) {
      this.entities.splice(index, 1);
    }
    // we don't want to end up with clean entities, so we're adding default one if the list if empty
    if (this.entities.length === 0) {
      this.addNewEntity();
    }
  }

  /** Components Catalog related methods */
  getCompatibleComponents(mode: AddStepMode, visualEntityData: CamelRouteVisualEntityData): TileFilter {
    if (mode === AddStepMode.ReplaceStep && visualEntityData.path === 'from') {
      /**
       * For the `from` step we want to show only components which are not `producerOnly`,
       * as this mean that they can be used only as a consumer.
       */
      return (item: ITile) => {
        return (item.type === CatalogKind.Component && !item.tags.includes('producerOnly')) || (item.type === CatalogKind.Kamelet && item.tags.includes('source'));
      };
    }

    if (mode === AddStepMode.InsertSpecialChildStep) {
      /**
       * specialChildren is a map of processor names and their special children.
       */
      const specialChildren: Record<string, string[]> = {
        choice: ['when', 'otherwise'],
        doTry: ['doCatch', 'doFinally'],
      };

      /**
       * For special child steps, we need to check which type of processor it is, in order to determine
       * what kind of components we want to show.
       */
      return (item: ITile) => {
        if (item.type !== CatalogKind.Processor || specialChildren[visualEntityData.processorName] === undefined) {
          return false;
        }

        return specialChildren[visualEntityData.processorName].includes(item.name);
      };
    }

    /**
     * For the rest, we want to filter out components that are `consumerOnly`,
     * as this mean that they can be used only as a consumer.
     */
    return (item: ITile) => {
      return !item.tags.includes('consumerOnly');
    };
  }
}
