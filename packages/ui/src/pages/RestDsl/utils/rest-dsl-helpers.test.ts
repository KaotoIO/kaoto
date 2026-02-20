import { getListItemClass } from './rest-dsl-helpers';

describe('rest-dsl-helpers', () => {
  describe('getListItemClass', () => {
    it('returns selected class for matching rest selection', () => {
      const selection = { kind: 'rest' as const, restId: 'rest-1' };
      const target = { kind: 'rest' as const, restId: 'rest-1' };

      expect(getListItemClass(selection, target)).toBe('rest-dsl-nav-item rest-dsl-nav-item-selected');
    });

    it('returns base class for non-matching rest selection', () => {
      const selection = { kind: 'rest' as const, restId: 'rest-1' };
      const target = { kind: 'rest' as const, restId: 'rest-2' };

      expect(getListItemClass(selection, target)).toBe('rest-dsl-nav-item');
    });

    it('returns selected class for matching operation selection', () => {
      const selection = { kind: 'operation' as const, restId: 'rest-1', verb: 'get' as const, index: 0 };
      const target = { kind: 'operation' as const, restId: 'rest-1', verb: 'get' as const, index: 0 };

      expect(getListItemClass(selection, target)).toBe('rest-dsl-nav-item rest-dsl-nav-item-selected');
    });

    it('returns base class for operation with different index', () => {
      const selection = { kind: 'operation' as const, restId: 'rest-1', verb: 'get' as const, index: 0 };
      const target = { kind: 'operation' as const, restId: 'rest-1', verb: 'get' as const, index: 1 };

      expect(getListItemClass(selection, target)).toBe('rest-dsl-nav-item');
    });

    it('returns base class when selection is undefined', () => {
      const target = { kind: 'rest' as const, restId: 'rest-1' };

      expect(getListItemClass(undefined, target)).toBe('rest-dsl-nav-item');
    });

    it('returns base class for mismatched kinds', () => {
      const selection = { kind: 'rest' as const, restId: 'rest-1' };
      const target = { kind: 'operation' as const, restId: 'rest-1', verb: 'get' as const, index: 0 };

      expect(getListItemClass(selection, target)).toBe('rest-dsl-nav-item');
    });
  });
});
