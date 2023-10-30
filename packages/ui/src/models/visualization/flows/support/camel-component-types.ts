import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
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
   * processor: the property can have a single processor
   * list: the property have a list of `processors`, f.i. `steps`
   * expression-list: the property can have a list of `processors`, usually in the shape of `expression`, f.i. `when` and `doCatch`
   */
  type: 'single-processor' | 'steps-list' | 'expression-list';
}
