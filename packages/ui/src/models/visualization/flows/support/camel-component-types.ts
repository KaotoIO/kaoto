import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { IVisualizationNodeData } from '../../base-visual-entity';

export interface ICamelElementLookupResult {
  processorName: keyof ProcessorDefinition;
  componentName?: string;
}

export type CamelRouteVisualEntityData = IVisualizationNodeData & ICamelElementLookupResult;

/**
 * Interface to shape the properties from Processors that can be filled
 * with nested Camel Processors.
 */
export interface CamelProcessorStepsProperties {
  /** Property name, f.i., `steps` */
  name: string;

  /**
   * Property handling type
   * single-clause: the property can have a single-clause type of processor, f.i. `otherwise` and `doFinally`
   * branch: the property have a list of `processors`, f.i. `steps`
   * clause-list: the property can have a list of clause processors, usually in the shape of `expression`, f.i. `when` and `doCatch`
   */
  type: 'single-clause' | 'branch' | 'clause-list';
}
