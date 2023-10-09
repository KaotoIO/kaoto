import { kameletBindingJson } from '../../../stubs/kamelet-binding-route';
import { KameletBindingVisualEntity } from '.';

describe('KameletBinding', () => {
  let kameletBinding: KameletBindingVisualEntity;

  beforeEach(() => {
    const kameletBindingCR = JSON.parse(JSON.stringify(kameletBindingJson));
    kameletBinding = new KameletBindingVisualEntity(
      kameletBindingCR.spec.source,
      kameletBindingCR.spec.steps,
      kameletBindingCR.spec.sink,
    );
  });

  it('should return the steps', () => {
    expect(kameletBinding.getSteps()).toEqual([
      {
        ref: {
          apiVersion: 'camel.apache.org/v1',
          kind: 'Kamelet',
          name: 'delay-action',
        },
      },
      {
        ref: {
          apiVersion: 'camel.apache.org/v1alpha1',
          kind: 'Kamelet',
          name: 'log-sink',
        },
      },
    ]);
  });
});
