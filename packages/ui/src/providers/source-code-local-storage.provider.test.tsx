import { act, render } from '@testing-library/react';

import { LocalStorageKeys } from '../models';
import { EventNotifier } from '../utils/event-notifier';
import { SourceCodeLocalStorageProvider } from './source-code-local-storage.provider';

describe('SourceCodeLocalStorageProvider', () => {
  it('should render children within SourceCodeProvider', () => {
    const { getByText } = render(
      <SourceCodeLocalStorageProvider>
        <div>Test Child</div>
      </SourceCodeLocalStorageProvider>,
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should initialize source code from localStorage', () => {
    const localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');

    render(<SourceCodeLocalStorageProvider />);

    expect(localStorageGetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.SourceCode);
    localStorageGetItemSpy.mockRestore();
  });

  it('should subscribe to eventNotifier events', () => {
    const mockSubscribe = jest.fn();
    const mockUnsubscribe = jest.fn();

    jest.spyOn(EventNotifier, 'getInstance').mockReturnValueOnce({
      subscribe: mockSubscribe.mockImplementation(() => mockUnsubscribe),
    } as unknown as EventNotifier);

    render(<SourceCodeLocalStorageProvider />);

    expect(mockSubscribe).toHaveBeenCalledWith('entities:updated', expect.any(Function));
    expect(mockSubscribe).toHaveBeenCalledWith('code:updated', expect.any(Function));
  });

  it('should unsubscribe from eventNotifier events on unmount', () => {
    const mockSubscribe = jest.fn();
    const mockUnsubscribe = jest.fn();

    jest.spyOn(EventNotifier, 'getInstance').mockReturnValueOnce({
      subscribe: mockSubscribe.mockImplementation(() => mockUnsubscribe),
    } as unknown as EventNotifier);

    const { unmount } = render(<SourceCodeLocalStorageProvider />);

    act(() => {
      unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('should update localStorage when entities:updated event is triggered', () => {
    const localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<SourceCodeLocalStorageProvider />);

    act(() => {
      EventNotifier.getInstance().next('entities:updated', 'new code');
    });

    expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.SourceCode, 'new code');
    localStorageSetItemSpy.mockRestore();
  });

  it('should update localStorage when code:updated event is triggered', () => {
    const localStorageSetItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<SourceCodeLocalStorageProvider />);

    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: 'new code', path: 'new path' });
    });

    expect(localStorageSetItemSpy).toHaveBeenCalledWith(LocalStorageKeys.SourceCode, 'new code');
    localStorageSetItemSpy.mockRestore();
  });
});
