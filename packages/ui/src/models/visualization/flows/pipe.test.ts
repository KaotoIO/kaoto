import { pipeJson } from '../../../stubs/pipe-route';
import { Pipe } from '.';

describe('Pipe', () => {
  let pipe: Pipe;

  beforeEach(() => {
    pipe = new Pipe(JSON.parse(JSON.stringify(pipeJson)));
  });

  it('should return the steps', () => {
    expect(pipe.getSteps()).toEqual([
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
