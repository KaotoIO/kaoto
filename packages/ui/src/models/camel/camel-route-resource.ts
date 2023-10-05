import { BeansAwareResource, CamelResource } from './camel-resource';
import { BaseCamelEntity } from './entities';
import { CamelRouteVisualEntity, isCamelRoute } from '../visualization/flows';
import { BeansEntity, isBeans } from '../visualization/metadata';
import { SourceSchemaType } from './source-schema-type';
import { isDefined } from '../../utils';

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
}
