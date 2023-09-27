import { EventNotifier } from './event-notifier';

describe('EventNotifier', () => {
  it('should notify subscribers', () => {
    const eventNotifier = new EventNotifier();
    const listener = jest.fn();

    eventNotifier.subscribe('code:update', listener);
    eventNotifier.next('code:update', 'my source code');

    expect(listener).toHaveBeenCalledWith('my source code');
  });

  it('should unsubscribe', () => {
    const eventNotifier = new EventNotifier();
    const listener = jest.fn();

    const unsubscribe = eventNotifier.subscribe('code:update', listener);
    unsubscribe();
    eventNotifier.next('code:update', 'payload');

    expect(listener).not.toHaveBeenCalled();
  });
});
