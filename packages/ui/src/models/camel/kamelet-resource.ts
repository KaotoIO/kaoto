import { KameletVisualEntity } from './../visualization/flows/kamelet-visual-entity';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { IKameletDefinition } from '../kamelets-catalog';
import { AddStepMode } from '../visualization/base-visual-entity';
import { FlowTemplateService } from '../visualization/flows/flow-templates-service';
import { CamelKResource } from './camel-k-resource';
import { SourceSchemaType } from './source-schema-type';
import { CamelRouteVisualEntityData } from '../visualization/flows/support/camel-component-types';
import { TileFilter } from '../../public-api';
import { CamelComponentFilterService } from '../visualization/flows/support/camel-component-filter.service';

export class KameletResource extends CamelKResource {
  private kamelet;
  private flow: KameletVisualEntity;

  constructor(kamelet?: IKameletDefinition) {
    super(kamelet);
    const kameletId = (kamelet?.metadata?.name as string) ?? getCamelRandomId('kamelet');

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

    this.flow = new KameletVisualEntity(this.kamelet);
  }

  refreshVisualMetadata() {
    this.flow = new KameletVisualEntity(this.kamelet);
  }

  removeEntity(): void {
    super.removeEntity();
    const flowTemplate: IKameletDefinition = FlowTemplateService.getFlowTemplate(this.getType());
    this.kamelet = flowTemplate;
    this.flow = new KameletVisualEntity(this.kamelet);
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
    return this.kamelet;
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
}
