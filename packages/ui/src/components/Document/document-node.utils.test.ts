import { KeyboardEvent } from 'react';

import { handleNodeKeyDown } from './document-node.utils';

describe('handleNodeKeyDown', () => {
  const makeEvent = (key: string, sameTarget = true) => {
    const target = {};
    return {
      key,
      target,
      currentTarget: sameTarget ? target : {},
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };
  };

  it('should call callback and prevent default on Enter', () => {
    const callback = jest.fn();
    const event = makeEvent('Enter');
    handleNodeKeyDown(event as unknown as KeyboardEvent, callback);
    expect(callback).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should call callback and prevent default on Space', () => {
    const callback = jest.fn();
    const event = makeEvent(' ');
    handleNodeKeyDown(event as unknown as KeyboardEvent, callback);
    expect(callback).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should not call callback when event originated from a child element', () => {
    const callback = jest.fn();
    const event = makeEvent('Enter', false);
    handleNodeKeyDown(event as unknown as KeyboardEvent, callback);
    expect(callback).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('should not call callback for other keys', () => {
    const callback = jest.fn();
    const event = makeEvent('Tab');
    handleNodeKeyDown(event as unknown as KeyboardEvent, callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
