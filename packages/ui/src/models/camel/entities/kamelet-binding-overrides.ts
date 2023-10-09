import { KameletBinding } from '@kaoto-next/camel-catalog/types';

export type KameletBindingSource = NonNullable<KameletBinding['spec']>['source'];
export type KameletBindingSink = NonNullable<KameletBinding['spec']>['sink'];
export type KameletBindingSteps = NonNullable<KameletBinding['spec']>['steps'];

// represents single step - the step definition for source, sink and step is equivalent
export type KameletBindingStep = NonNullable<KameletBinding['spec']>['source'];
