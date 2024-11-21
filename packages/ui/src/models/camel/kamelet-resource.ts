import { set } from 'lodash';
import { TileFilter } from '../../components/Catalog/Catalog.models';
import { IKameletDefinition } from '../kamelets-catalog';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { FlowTemplateService } from '../visualization/flows/support/flow-templates-service';
import {
  RouteTemplateBeansEntity,
  RouteTemplateBeansParentType,
} from '../visualization/metadata/routeTemplateBeansEntity';
import { KameletVisualEntity } from './../visualization/flows/kamelet-visual-entity';
import { CamelKResource } from './camel-k-resource';
import { RouteTemplateBeansAwareResource } from './camel-resource';
import { SourceSchemaType } from './source-schema-type';

export class KameletResource extends CamelKResource implements RouteTemplateBeansAwareResource {
  private flow: KameletVisualEntity;
  private beans?: RouteTemplateBeansEntity;

  constructor(kamelet?: IKameletDefinition) {
    super(kamelet);

    if (!kamelet) {
      this.resource = FlowTemplateService.getFlowTemplate(this.getType());
    }

    this.flow = new KameletVisualEntity(this.resource as IKameletDefinition);
    if (this.flow.kamelet.spec.template.beans) {
      this.beans = new RouteTemplateBeansEntity(this.flow.kamelet.spec.template as RouteTemplateBeansParentType);
    }
  }

  refreshVisualMetadata() {
    this.flow = new KameletVisualEntity(this.resource as IKameletDefinition);
  }

  removeEntity(): void {
    super.removeEntity();
    this.resource = FlowTemplateService.getFlowTemplate(this.getType());
    this.flow = new KameletVisualEntity(this.resource as IKameletDefinition);
    this.beans = undefined;
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Kamelet;
  }

  getVisualEntities(): KameletVisualEntity[] {
    /** A kamelet always have a single flow defined, even if is empty */
    return [this.flow];
  }

  toJSON(): IKameletDefinition {
    /**
     * The underlying CamelRouteVisualEntity has a root route property which holds
     * the route definition. Inside of this property, there's a `from` property which
     * holds the kamelet definition.
     *
     * The `from` kamelet property is a reference to the underlying CamelRouteVisualEntity
     * and this way the kamelet definition is updated when the user interacts with
     * the CamelRouteVisualEntity.
     */
    set(this.resource, 'metadata.name', this.flow.getId());
    set(this.resource, 'spec.template.from', this.flow.entityDef.template.from);
    set(this.resource, 'spec.template.beans', this.beans?.parent.beans);
    return this.resource as IKameletDefinition;
  }

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    return CamelComponentFilterService.getKameletCompatibleComponents(mode, visualEntityData, definition);
  }

  getRouteTemplateBeansEntity(): RouteTemplateBeansEntity | undefined {
    return this.beans;
  }

  createRouteTemplateBeansEntity(): RouteTemplateBeansEntity {
    this.flow.kamelet.spec.template.beans = [];
    this.beans = new RouteTemplateBeansEntity(this.flow.kamelet.spec.template as RouteTemplateBeansParentType);
    return this.beans;
  }

  deleteRouteTemplateBeansEntity(): void {
    this.flow.kamelet.spec.template.beans = undefined;
    this.beans = undefined;
  }
}
