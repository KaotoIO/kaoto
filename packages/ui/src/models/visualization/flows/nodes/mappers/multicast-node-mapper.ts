import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { ParallelProcessorBaseNodeMapper } from './parallel-processor-base-node-mapper';

export class MulticastNodeMapper extends ParallelProcessorBaseNodeMapper {
  getProcessorName(): keyof ProcessorDefinition {
    return 'multicast';
  }
}
