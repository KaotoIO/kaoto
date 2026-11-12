import { CatalogKind, IVisualizationNode } from '../../models';
import { citrusWaitForActivationFn } from './citrus-wait-for.activationfn';

describe('citrusWaitForActivationFn', () => {
  it('should return false if vizNode is `undefined`', () => {
    expect(citrusWaitForActivationFn()).toBe(false);
  });

  it('should return false if the node has no primaryNodeId', () => {
    expect(citrusWaitForActivationFn({ data: {} } as unknown as IVisualizationNode)).toBe(false);
  });

  const TEST_CASES: [boolean, string, CatalogKind][] = [
    [true, 'waitFor', CatalogKind.TestAction],
    [false, 'waitFor', CatalogKind.Processor],
    [false, 'waitFor', CatalogKind.Pattern],
    [false, 'print', CatalogKind.TestAction],
    [false, 'sleep', CatalogKind.TestAction],
  ];
  it.each(TEST_CASES)('should return "%s" for "%s" of kind "%s"', (expectedResult, name, catalogKind) => {
    const result = citrusWaitForActivationFn({
      data: { primaryNodeId: { name, catalogKind } },
    } as unknown as IVisualizationNode);

    expect(result).toBe(expectedResult);
  });
});
