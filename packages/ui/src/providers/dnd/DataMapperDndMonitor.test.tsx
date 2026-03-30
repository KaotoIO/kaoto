import { render } from '@testing-library/react';

import { DataMapperDnDMonitor } from './DataMapperDndMonitor';

type DndHandlers = {
  onDragStart: (event: unknown) => void;
  onDragOver: (event: unknown) => void;
  onDragEnd: (event: unknown) => void;
  onDragCancel: (event: unknown) => void;
};

let capturedHandlers: DndHandlers | undefined;

jest.mock('@dnd-kit/core', () => ({
  ...jest.requireActual('@dnd-kit/core'),
  useDndMonitor: (handlers: DndHandlers) => {
    capturedHandlers = handlers;
  },
}));

const mockEvent = {
  active: { data: { current: { path: { toString: () => 'source/path' } } } },
  over: { data: { current: { path: { toString: () => 'target/path' } } } },
};

describe('DataMapperDnDMonitor', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedHandlers = undefined;
    consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should register dnd event handlers', () => {
    render(<DataMapperDnDMonitor />);
    expect(capturedHandlers).toBeDefined();
  });

  it('should log on drag start', () => {
    render(<DataMapperDnDMonitor />);
    capturedHandlers?.onDragStart(mockEvent);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragStart'));
  });

  it('should log on drag over', () => {
    render(<DataMapperDnDMonitor />);
    capturedHandlers?.onDragOver(mockEvent);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragOver'));
  });

  it('should log on drag end', () => {
    render(<DataMapperDnDMonitor />);
    capturedHandlers?.onDragEnd(mockEvent);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragEnd'));
  });

  it('should log on drag cancel', () => {
    render(<DataMapperDnDMonitor />);
    capturedHandlers?.onDragCancel(mockEvent);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('onDragCancel'));
  });
});
