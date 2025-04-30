import { IVisibleFlows } from '../models/visualization/flows/support/flows-visibility';
import { initVisibleFlows } from './init-visible-flows';

describe('initVisibleFlows', () => {
  it('should return an empty object when given an empty array', () => {
    const result = initVisibleFlows([]);
    expect(result).toEqual({});
  });

  it('should set all the flows to visible (true)', () => {
    const flowIds = ['flow1', 'flow2', 'flow3'];
    const expected: IVisibleFlows = {
      flow1: true,
      flow2: true,
      flow3: true,
    };
    const result = initVisibleFlows(flowIds);
    expect(result).toEqual(expected);
  });

  it('should handle a single flow id correctly', () => {
    const flowIds = ['flow1'];
    const expected: IVisibleFlows = {
      flow1: true,
    };
    const result = initVisibleFlows(flowIds);
    expect(result).toEqual(expected);
  });
});
