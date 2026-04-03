import { IVisualizationNode } from '../../models';
import { groupAutoStartupActivationFn } from './group-auto-startup.activationfn';

describe('groupAutoStartupActivationFn', () => {
  it('should return false if node is not a group', () => {
    const result = groupAutoStartupActivationFn({
      data: {
        isGroup: false,
        entity: {
          getRootPath: () => 'route',
        },
      },
    } as unknown as IVisualizationNode);

    expect(result).toBe(false);
  });

  it('should return false if entity is undefined', () => {
    const result = groupAutoStartupActivationFn({
      data: {
        isGroup: true,
        entity: undefined,
      },
    } as unknown as IVisualizationNode);

    expect(result).toBe(false);
  });

  it('should return false if rootPath is not "route"', () => {
    const result = groupAutoStartupActivationFn({
      data: {
        isGroup: true,
        entity: {
          getRootPath: () => 'from',
        },
      },
    } as unknown as IVisualizationNode);

    expect(result).toBe(false);
  });

  it('should return true when node is a group with route entity', () => {
    const result = groupAutoStartupActivationFn({
      data: {
        isGroup: true,
        entity: {
          getRootPath: () => 'route',
        },
      },
    } as unknown as IVisualizationNode);

    expect(result).toBe(true);
  });

  const TEST_CASES = [
    [false, false, undefined, 'route', 'node is not a group'],
    [false, true, undefined, 'route', 'entity is undefined'],
    [false, true, {}, 'from', 'rootPath is not route'],
    [false, true, {}, 'routeConfiguration', 'rootPath is routeConfiguration'],
    [true, true, {}, 'route', 'all conditions are met'],
  ] as const;

  it.each(TEST_CASES)(
    'should return %s when isGroup=%s, entity=%s, rootPath=%s (%s)',
    (expectedResult, isGroup, entity, rootPath, _description) => {
      const vizNode = {
        data: {
          isGroup,
          entity: entity
            ? {
                getRootPath: () => rootPath,
              }
            : undefined,
        },
      } as unknown as IVisualizationNode;

      const result = groupAutoStartupActivationFn(vizNode);

      expect(result).toBe(expectedResult);
    },
  );
});
