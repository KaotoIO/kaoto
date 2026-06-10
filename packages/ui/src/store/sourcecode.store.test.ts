import { EventNotifier } from '../utils/event-notifier';
import { useSourceCodeStore } from './sourcecode.store';

describe('useSourceCodeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSourceCodeStore.setState({ sourceCode: '', path: '' });
  });

  describe('setSourceCode', () => {
    it('should set sourceCode without emitting event', () => {
      const notifier = EventNotifier.getInstance();
      const nextSpy = vi.spyOn(notifier, 'next');

      useSourceCodeStore.getState().setSourceCode('test code');

      expect(useSourceCodeStore.getState().sourceCode).toBe('test code');
      expect(nextSpy).not.toHaveBeenCalled();

      nextSpy.mockRestore();
    });

    it('should update sourceCode when called multiple times', () => {
      useSourceCodeStore.getState().setSourceCode('first code');
      expect(useSourceCodeStore.getState().sourceCode).toBe('first code');

      useSourceCodeStore.getState().setSourceCode('second code');
      expect(useSourceCodeStore.getState().sourceCode).toBe('second code');
    });

    it('should handle empty string', () => {
      useSourceCodeStore.getState().setSourceCode('some code');
      useSourceCodeStore.getState().setSourceCode('');

      expect(useSourceCodeStore.getState().sourceCode).toBe('');
    });
  });

  describe('setPath', () => {
    it('should set path', () => {
      useSourceCodeStore.getState().setPath('test.yaml');

      expect(useSourceCodeStore.getState().path).toBe('test.yaml');
    });

    it('should set path to undefined', () => {
      useSourceCodeStore.getState().setPath('test.yaml');
      useSourceCodeStore.getState().setPath(undefined);

      expect(useSourceCodeStore.getState().path).toBeUndefined();
    });

    it('should update path when called multiple times', () => {
      useSourceCodeStore.getState().setPath('first.yaml');
      expect(useSourceCodeStore.getState().path).toBe('first.yaml');

      useSourceCodeStore.getState().setPath('second.yaml');
      expect(useSourceCodeStore.getState().path).toBe('second.yaml');
    });
  });

  describe('setCodeAndNotify', () => {
    it('should set sourceCode/path and emit code:updated', () => {
      const notifier = EventNotifier.getInstance();
      const nextSpy = vi.spyOn(notifier, 'next');

      useSourceCodeStore.getState().setCodeAndNotify('my code', 'my.yaml');

      expect(useSourceCodeStore.getState().sourceCode).toBe('my code');
      expect(useSourceCodeStore.getState().path).toBe('my.yaml');
      expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: 'my code', path: 'my.yaml' });

      nextSpy.mockRestore();
    });

    it('should set sourceCode without path', () => {
      const notifier = EventNotifier.getInstance();
      const nextSpy = vi.spyOn(notifier, 'next');

      useSourceCodeStore.getState().setCodeAndNotify('code only');

      expect(useSourceCodeStore.getState().sourceCode).toBe('code only');
      expect(useSourceCodeStore.getState().path).toBeUndefined();
      expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: 'code only', path: undefined });

      nextSpy.mockRestore();
    });

    it('should emit event every time it is called', () => {
      const notifier = EventNotifier.getInstance();
      const nextSpy = vi.spyOn(notifier, 'next');

      useSourceCodeStore.getState().setCodeAndNotify('first', 'first.yaml');
      useSourceCodeStore.getState().setCodeAndNotify('second', 'second.yaml');

      expect(nextSpy).toHaveBeenCalledTimes(2);
      expect(nextSpy).toHaveBeenNthCalledWith(1, 'code:updated', { code: 'first', path: 'first.yaml' });
      expect(nextSpy).toHaveBeenNthCalledWith(2, 'code:updated', { code: 'second', path: 'second.yaml' });

      nextSpy.mockRestore();
    });

    it('should handle empty code and undefined path', () => {
      const notifier = EventNotifier.getInstance();
      const nextSpy = vi.spyOn(notifier, 'next');

      useSourceCodeStore.getState().setCodeAndNotify('');

      expect(useSourceCodeStore.getState().sourceCode).toBe('');
      expect(useSourceCodeStore.getState().path).toBeUndefined();
      expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: '', path: undefined });

      nextSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('should have empty sourceCode initially', () => {
      const state = useSourceCodeStore.getState();
      expect(state.sourceCode).toBe('');
    });

    it('should have empty path initially', () => {
      const state = useSourceCodeStore.getState();
      expect(state.path).toBe('');
    });
  });
});
