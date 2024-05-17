import { BeansDeserializer, BeanFactory } from '@kaoto/camel-catalog/types';
import { BeansAwareResource, CamelResource, RouteTemplateBeansAwareResource } from '../../camel';
import { EntityType } from '../../camel/entities';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { CamelCatalogService } from '../flows/camel-catalog.service';
import { BeansEntity } from './beansEntity';
import { RouteTemplateBeansEntity } from './routeTemplateBeansEntity';

/**
 * This class is to absorb a little bit of difference between beans such as {@link BeanFactory}.
 */
export class BeansEntityHandler {
  private type: 'beans' | 'routeTemplateBean' | undefined;
  private beansAware: BeansAwareResource | RouteTemplateBeansAwareResource | undefined;
  constructor(private camelResource?: CamelResource) {
    if (!this.camelResource) return;
    if ((this.camelResource as unknown as BeansAwareResource).createBeansEntity !== undefined) {
      this.beansAware = this.camelResource as unknown as BeansAwareResource;
      this.type = 'beans';
    } else if (
      (this.camelResource as unknown as RouteTemplateBeansAwareResource).createRouteTemplateBeansEntity !== undefined
    ) {
      this.beansAware = this.camelResource as unknown as RouteTemplateBeansAwareResource;
      this.type = 'routeTemplateBean';
    }
  }

  isSupported() {
    return this.type !== undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBeanSchema(): KaotoSchemaDefinition['schema'] | undefined {
    switch (this.type) {
      case 'beans':
        return CamelCatalogService.getComponent(CatalogKind.Entity, 'bean')?.propertiesSchema;
      case 'routeTemplateBean':
        return CamelCatalogService.getComponent(CatalogKind.Entity, 'routeTemplateBean')?.propertiesSchema;
      default:
        return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBeansSchema(): KaotoSchemaDefinition['schema'] | undefined {
    switch (this.type) {
      case 'beans': {
        const beanCatalog = CamelCatalogService.getComponent(CatalogKind.Entity, 'beans');
        return beanCatalog?.propertiesSchema;
      }
      case 'routeTemplateBean': {
        const beanCatalog = CamelCatalogService.getComponent(CatalogKind.Entity, 'routeTemplateBean');
        const schema = beanCatalog?.propertiesSchema;
        return !schema
          ? undefined
          : {
              title: schema.title,
              description: schema.description,
              type: 'array',
              definitions: schema.definitions,
              items: schema,
            };
      }
      default:
        return undefined;
    }
  }

  getBeansModel() {
    return this.getBeansEntity()?.parent.beans;
  }

  setBeansModel(model: BeansDeserializer | BeanFactory[]) {
    if (!Array.isArray(model) || model.length === 0) {
      const entity = this.getBeansEntity();
      entity && this.deleteBeansEntity(entity);
      return;
    }

    let entity = this.getBeansEntity();
    if (!entity) {
      entity = this.createBeansEntity();
    }
    if (entity) {
      entity.parent.beans = model;
    }
  }

  createBeansEntity() {
    switch (this.type) {
      case 'beans':
        return (this.beansAware as BeansAwareResource).createBeansEntity();
      case 'routeTemplateBean':
        return (this.beansAware as RouteTemplateBeansAwareResource).createRouteTemplateBeansEntity();
      default:
        return undefined;
    }
  }

  getBeansEntity() {
    switch (this.type) {
      case 'beans':
        return this.camelResource?.getEntities().find((item) => item.type === EntityType.Beans) as
          | BeansEntity
          | undefined;
      case 'routeTemplateBean':
        return (this.beansAware as RouteTemplateBeansAwareResource).getRouteTemplateBeansEntity();
      default:
        return undefined;
    }
  }

  deleteBeansEntity(entity: BeansEntity | RouteTemplateBeansEntity) {
    switch (this.type) {
      case 'beans':
        (this.beansAware as BeansAwareResource).deleteBeansEntity(entity as BeansEntity);
        break;
      case 'routeTemplateBean':
        (this.beansAware as RouteTemplateBeansAwareResource).deleteRouteTemplateBeansEntity();
        break;
    }
  }

  getAllBeansNameAndType(): { name: string; type: string }[] {
    const allBeans = this.getBeansModel();
    if (!allBeans) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return allBeans?.map((bean: any) => {
      return { name: bean.name, type: bean.type };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addNewBean(model: any) {
    const beansEntityToAdd = this.getBeansEntity() ? this.getBeansEntity() : this.createBeansEntity();
    beansEntityToAdd?.parent.beans.push(model);
  }

  getReferenceFromName(name: string) {
    switch (this.type) {
      case 'beans':
        return '#' + name;
      case 'routeTemplateBean':
        return `#bean:{{${name}}}`;
    }
  }

  getReferenceQuote() {
    switch (this.type) {
      case 'beans':
        return '#';
      case 'routeTemplateBean':
        return '#bean:{{}}';
    }
  }

  stripReferenceQuote(inputValue: string) {
    switch (this.type) {
      case 'beans':
        return inputValue && inputValue.startsWith('#') ? inputValue.substring(1) : inputValue;
      case 'routeTemplateBean': {
        const leftStripped = inputValue && inputValue.startsWith('#bean:{{') ? inputValue.substring(8) : inputValue;
        return leftStripped && leftStripped.endsWith('}}')
          ? leftStripped.substring(0, leftStripped.length - 2)
          : leftStripped;
      }
    }
  }
}
