import { EventNotifier } from './event-notifier';

describe('EventNotifier', () => {
  it('should notify subscribers', () => {
    const eventNotifier = new EventNotifier();
    const listener = jest.fn();

    eventNotifier.subscribe('code:updated', listener);
    eventNotifier.next('code:updated', { code: 'my source code' });

    expect(listener).toHaveBeenCalledWith({ code: 'my source code' });
  });

  it('should unsubscribe', () => {
    const eventNotifier = new EventNotifier();
    const listener = jest.fn();

    const unsubscribe = eventNotifier.subscribe('code:updated', listener);
    unsubscribe();
    eventNotifier.next('code:updated', { code: 'payload' });

    expect(listener).not.toHaveBeenCalled();
  });
});
