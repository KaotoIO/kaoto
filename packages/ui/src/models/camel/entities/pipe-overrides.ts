import { Pipe } from '@kaoto-next/camel-catalog/types';

export type PipeSpec = NonNullable<Pipe['spec']>;
export type PipeMetadata = NonNullable<Pipe['metadata']>;
export type PipeSource = NonNullable<Pipe['spec']>['source'];
export type PipeSink = NonNullable<Pipe['spec']>['sink'];
export type PipeSteps = NonNullable<Pipe['spec']>['steps'];

// represents single step - the step definition for source, sink and step is equivalent
export type PipeStep = NonNullable<Pipe['spec']>['source'];

export interface PipeSpecErrorHandler extends PipeSpec {
  errorHandler: Required<PipeSpec['errorHandler']>;
}
