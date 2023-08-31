import { Step } from './step';

describe('Step', () => {
  let step: Step;

  beforeEach(() => {
    step = new Step();
  });

  it('should not have an id by default', () => {
    expect(step.id).toBe('');
  });

  it('should not have steps by default', () => {
    expect(step.steps).toEqual(undefined);
  });

  it('should return its steps', () => {
    step.steps = [new Step(), new Step()];

    expect(step._getSteps()).toHaveLength(2);
  });
});
