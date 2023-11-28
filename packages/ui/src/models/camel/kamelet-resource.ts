import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { TileFilter } from '../../components/Catalog/Catalog.models';
import { IKameletDefinition } from '../kamelets-catalog';
import { AddStepMode } from '../visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../visualization/flows/camel-route-visual-entity';
import { FlowTemplateService } from '../visualization/flows/flow-templates-service';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { CamelKResource } from './camel-k-resource';
import { SourceSchemaType } from './source-schema-type';

export class KameletResource extends CamelKResource {
  private kamelet;
  private flow: CamelRouteVisualEntity;

  constructor(kamelet?: IKameletDefinition) {
    const kameletId = getCamelRandomId('kamelet');
    super(kamelet);

    if (kamelet) {
      this.kamelet = kamelet;
    } else {
      this.kamelet = this.resource as IKameletDefinition;
      this.kamelet.kind = SourceSchemaType.Kamelet;
      this.kamelet.spec = {
        definition: {
          title: kameletId,
          type: 'source',
        },
        dependencies: [],
        template: {
          from: {
            id: getCamelRandomId('from'),
            uri: 'kamelet:source',
            steps: [],
          },
          beans: {},
        },
      };
    }

    this.flow = new CamelRouteVisualEntity({ id: kameletId, from: this.kamelet.spec.template.from });
  }

  removeEntity(): void {
    super.removeEntity();
    const flowTemplate: IKameletDefinition = FlowTemplateService.getFlowTemplate(this.getType());
    this.kamelet.spec = flowTemplate.spec;
    this.flow = new CamelRouteVisualEntity({ from: flowTemplate.spec.template.from });
  }

  getType(): SourceSchemaType {
    return SourceSchemaType.Kamelet;
  }

  getVisualEntities(): CamelRouteVisualEntity[] {
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
    return this.kamelet;
  }

  /** Components Catalog related methods */
  getCompatibleComponents(
    mode: AddStepMode,
    visualEntityData: CamelRouteVisualEntityData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
  ): TileFilter {
    return CamelComponentFilterService.getCompatibleComponents(mode, visualEntityData, definition);
  }
}
