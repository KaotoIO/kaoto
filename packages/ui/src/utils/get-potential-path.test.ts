import { getPotentialPath } from './get-potential-path';

describe('getPotentialPath', () => {
  describe('forward direction', () => {
    it('should increment last element when it is integer and penultimate is not', () => {
      expect(getPotentialPath('route.from.steps.0', 'forward')).toBe('route.from.steps.1');
      expect(getPotentialPath('route.from.steps.5', 'forward')).toBe('route.from.steps.6');
    });

    it('should increment penultimate element when last is not integer and penultimate is', () => {
      expect(getPotentialPath('route.from.steps.0.when', 'forward')).toBe('route.from.steps.1');
      expect(getPotentialPath('route.from.steps.3.doCatch', 'forward')).toBe('route.from.steps.4');
    });

    it('should handle single element paths', () => {
      expect(getPotentialPath('0', 'forward')).toBeUndefined();
      expect(getPotentialPath('route', 'forward')).toBeUndefined();
    });
  });

  describe('backward direction', () => {
    it('should decrement last element when it is integer and penultimate is not', () => {
      expect(getPotentialPath('route.from.steps.1', 'backward')).toBe('route.from.steps.0');
      expect(getPotentialPath('route.from.steps.5', 'backward')).toBe('route.from.steps.4');
    });

    it('should decrement penultimate element when last is not integer and penultimate is', () => {
      expect(getPotentialPath('route.from.steps.1.when', 'backward')).toBe('route.from.steps.0');
      expect(getPotentialPath('route.from.steps.3.doCatch', 'backward')).toBe('route.from.steps.2');
    });

    it('should return undefined when trying to go below 0', () => {
      expect(getPotentialPath('route.from.steps.0', 'backward')).toBeUndefined();
      expect(getPotentialPath('route.from.steps.0.when', 'backward')).toBeUndefined();
      expect(getPotentialPath('0', 'backward')).toBeUndefined();
    });

    it('should handle single element paths', () => {
      expect(getPotentialPath('1', 'backward')).toBeUndefined();
      expect(getPotentialPath('route  ', 'backward')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should return undefined for empty or invalid paths', () => {
      expect(getPotentialPath()).toBeUndefined();
      expect(getPotentialPath('')).toBeUndefined();
      expect(getPotentialPath('.')).toBeUndefined();
    });

    it('should return undefined when no integer pattern is found', () => {
      expect(getPotentialPath('route.from', 'forward')).toBeUndefined();
      expect(getPotentialPath('route.from.steps', 'forward')).toBeUndefined();
    });

    it('should handle negative numbers correctly', () => {
      expect(getPotentialPath('route.from.steps.-1', 'forward')).toBeUndefined();
      expect(getPotentialPath('route.from.steps.1.when', 'backward')).toBe('route.from.steps.0');
    });

    it('should use forward as default direction', () => {
      expect(getPotentialPath('route.from.steps.0')).toBe('route.from.steps.1');
    });
  });
});
