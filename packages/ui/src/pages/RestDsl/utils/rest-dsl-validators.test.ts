import { isValidOperationId } from './rest-dsl-validators';

describe('rest-dsl-validators', () => {
  describe('isValidOperationId', () => {
    it('returns true for valid alphanumeric IDs', () => {
      expect(isValidOperationId('getUsers')).toBe(true);
      expect(isValidOperationId('createUser123')).toBe(true);
      expect(isValidOperationId('DELETE_USER')).toBe(true);
    });

    it('returns true for IDs with hyphens and underscores', () => {
      expect(isValidOperationId('get-users')).toBe(true);
      expect(isValidOperationId('get_users')).toBe(true);
      expect(isValidOperationId('get-users_v2')).toBe(true);
    });

    it('returns false for empty or whitespace-only strings', () => {
      expect(isValidOperationId('')).toBe(false);
      expect(isValidOperationId('   ')).toBe(false);
    });

    it('returns false for IDs with invalid characters', () => {
      expect(isValidOperationId('get users')).toBe(false);
      expect(isValidOperationId('get@users')).toBe(false);
      expect(isValidOperationId('get.users')).toBe(false);
      expect(isValidOperationId('get/users')).toBe(false);
    });

    it('trims whitespace before validation', () => {
      expect(isValidOperationId('  getUsers  ')).toBe(true);
    });
  });
});
