import { act, renderHook } from '@testing-library/react';
import { MouseEvent as ReactMouseEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { usePanelResizer } from './usePanelResizer';

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const OPTIONS = { initialWidth: DEFAULT_WIDTH, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };

const mouseDown = (clientX: number) => ({ clientX }) as ReactMouseEvent;
const moveTo = (clientX: number) => {
  act(() => {
    document.dispatchEvent(new MouseEvent('mousemove', { clientX }));
  });
};

describe('usePanelResizer', () => {
  it('starts with the initial width', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    expect(result.current.width).toBe(DEFAULT_WIDTH);
  });

  it('follows the drag', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    act(() => {
      result.current.handleResizerMouseDown(mouseDown(100));
    });
    moveTo(150);

    expect(result.current.width).toBe(DEFAULT_WIDTH + 50);
  });

  it('clamps the width to the minimum', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    act(() => {
      result.current.handleResizerMouseDown(mouseDown(500));
    });
    moveTo(0);

    expect(result.current.width).toBe(MIN_WIDTH);
  });

  it('clamps the width to the maximum', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    act(() => {
      result.current.handleResizerMouseDown(mouseDown(0));
    });
    moveTo(5000);

    expect(result.current.width).toBe(MAX_WIDTH);
  });

  it('stops following the mouse after mouseup', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    act(() => {
      result.current.handleResizerMouseDown(mouseDown(100));
    });
    moveTo(150);
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
    moveTo(200);

    expect(result.current.width).toBe(DEFAULT_WIDTH + 50);
  });

  it('starts the next drag from the current width', () => {
    const { result } = renderHook(() => usePanelResizer(OPTIONS));

    act(() => {
      result.current.handleResizerMouseDown(mouseDown(100));
    });
    moveTo(150);
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
    act(() => {
      result.current.handleResizerMouseDown(mouseDown(300));
    });
    moveTo(310);

    expect(result.current.width).toBe(DEFAULT_WIDTH + 60);
  });
});
