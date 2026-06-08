import { EventNotifier } from '../utils/event-notifier';
import { useSourceCodeStore } from './sourcecode.store';

describe('useSourceCodeStore', () => {
  it('setCodeAndNotify sets sourceCode/path and emits code:updated', () => {
    const notifier = EventNotifier.getInstance();
    const nextSpy = jest.spyOn(notifier, 'next');

    useSourceCodeStore.getState().setCodeAndNotify('my code', 'my.yaml');

    expect(useSourceCodeStore.getState().sourceCode).toBe('my code');
    expect(useSourceCodeStore.getState().path).toBe('my.yaml');
    expect(nextSpy).toHaveBeenCalledWith('code:updated', { code: 'my code', path: 'my.yaml' });

    nextSpy.mockRestore();
  });
});
