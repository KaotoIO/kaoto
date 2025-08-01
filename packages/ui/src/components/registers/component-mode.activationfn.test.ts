import { IVisualizationNode } from '../../models';
import { componentModeActivationFn } from './component-mode.activationfn';

describe('componentModeActivationFn', () => {
  it('should return false if vizNode is `undefined`', () => {
    const result = componentModeActivationFn();

    expect(result).toBe(false);
  });

  const TEST_CASES = [
    [true, 'to'],
    [true, 'toD'],
    [true, 'poll'],
    [false, 'from'],
    [false, 'log'],
    [false, 'other'],
  ];
  it.each(TEST_CASES)('should return "%s" for "%s"', (expectedResult, processorName) => {
    const result = componentModeActivationFn({
      data: { processorName },
    } as unknown as IVisualizationNode);

    expect(result).toBe(expectedResult);
  });
});
