import { IVisibleFlows } from '../models/visualization/flows/support/flows-visibility';
import { initVisibleFlows } from './init-visible-flows';

describe('initVisibleFlows', () => {
  it('should return an empty object when given an empty array', () => {
    const result = initVisibleFlows([]);
    expect(result).toEqual({});
  });

  it('should set the first flow to visible (true) and others to not visible (false)', () => {
    const flowIds = ['flow1', 'flow2', 'flow3'];
    const expected: IVisibleFlows = {
      flow1: true,
      flow2: false,
      flow3: false,
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

  it('should keep at least one flow visible', () => {
    const flowIds = ['flow1', 'flow2'];
    const expected: IVisibleFlows = {
      flow1: true,
      flow2: false,
    };
    const result = initVisibleFlows(flowIds);
    expect(result).toEqual(expected);
  });
});
