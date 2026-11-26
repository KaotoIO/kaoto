import { act, render } from '@testing-library/react';
import { createElement, MouseEvent as ReactMouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePanelResizer } from './usePanelResizer';

const CSS_VARIABLE = '--test-panel-inline-size';
const STORAGE_KEY = 'testPanelWidth';
const OPTIONS = { cssVariable: CSS_VARIABLE, initialWidth: 240, minWidth: 160, maxWidth: 480, storageKey: STORAGE_KEY };

interface PanelProbe {
  handleResizerMouseDown?: (event: ReactMouseEvent) => void;
  renders: number;
}

/** Renders an element that carries the variable, and counts the renders of the component holding the hook */
const renderPanel = (options: Parameters<typeof usePanelResizer>[0] = OPTIONS) => {
  const probe: PanelProbe = { renders: 0 };
  const Panel = () => {
    const { widthVariableElementRef, handleResizerMouseDown } = usePanelResizer(options);
    probe.handleResizerMouseDown = handleResizerMouseDown;
    probe.renders += 1;
    return createElement('div', { ref: widthVariableElementRef, 'data-testid': 'panel' });
  };
  const rendered = render(createElement(Panel));
  const width = () => rendered.getByTestId('panel').style.getPropertyValue(CSS_VARIABLE);
  return { ...rendered, probe, width };
};

const pressHandle = (probe: PanelProbe, clientX: number) => {
  act(() => {
    probe.handleResizerMouseDown!({ clientX } as ReactMouseEvent);
  });
};

const moveTo = (clientX: number) => {
  act(() => {
    document.dispatchEvent(new MouseEvent('mousemove', { clientX }));
  });
};

const release = () => {
  act(() => {
    document.dispatchEvent(new MouseEvent('mouseup'));
  });
};

describe('usePanelResizer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the variable to the initial width when the element attaches', () => {
    const { width } = renderPanel();

    expect(width()).toBe('240px');
  });

  it('follows the drag', () => {
    const { probe, width } = renderPanel();

    pressHandle(probe, 100);
    moveTo(150);

    expect(width()).toBe('290px');
  });

  it.each([
    ['minimum', 500, 0, '160px'],
    ['maximum', 0, 5000, '480px'],
  ])('clamps the width to the %s', (_, from, to, expected) => {
    const { probe, width } = renderPanel();

    pressHandle(probe, from);
    moveTo(to);

    expect(width()).toBe(expected);
  });

  it('stays at the maximum until the mouse comes back to the handle', () => {
    const { probe, width } = renderPanel();

    pressHandle(probe, 0);
    moveTo(5000);
    moveTo(4990);
    expect(width()).toBe('480px');

    moveTo(230);
    expect(width()).toBe('470px');
  });

  it('stops following the mouse after mouseup', () => {
    const { probe, width } = renderPanel();

    pressHandle(probe, 100);
    moveTo(150);
    release();
    moveTo(200);

    expect(width()).toBe('290px');
  });

  it('starts the next drag from the current width', () => {
    const { probe, width } = renderPanel();

    pressHandle(probe, 100);
    moveTo(150);
    release();
    pressHandle(probe, 300);
    moveTo(320);

    expect(width()).toBe('310px');
  });

  it('does not render while dragging', () => {
    const { probe } = renderPanel();
    const rendersBefore = probe.renders;

    pressHandle(probe, 100);
    moveTo(120);
    moveTo(140);
    moveTo(160);

    expect(probe.renders).toBe(rendersBefore);
  });

  it('renders once when the mouse is released, as the width is stored', () => {
    const { probe } = renderPanel();
    pressHandle(probe, 100);
    moveTo(160);
    const rendersBefore = probe.renders;

    release();

    expect(probe.renders).toBe(rendersBefore + 1);
  });

  it('forgets the element when it unmounts', () => {
    const { probe, getByTestId, unmount } = renderPanel();
    const detachedPanel = getByTestId('panel');

    pressHandle(probe, 100);
    unmount();
    moveTo(150);
    release();

    expect(detachedPanel.style.getPropertyValue(CSS_VARIABLE)).toBe('240px');
  });

  describe('the stored width', () => {
    it('starts from the stored width', () => {
      localStorage.setItem(STORAGE_KEY, '300');

      const { width } = renderPanel();

      expect(width()).toBe('300px');
    });

    it.each([
      ['nothing is stored', null],
      ['the stored value is empty', '  '],
      ['the stored value is not a number', 'wide'],
    ])('starts from the initial width when %s', (_, stored) => {
      if (stored !== null) localStorage.setItem(STORAGE_KEY, stored);

      const { width } = renderPanel();

      expect(width()).toBe('240px');
    });

    it.each([
      ['maximum', '9000', '480px'],
      ['minimum', '10', '160px'],
    ])('clamps a stored width to the %s', (_, stored, expected) => {
      localStorage.setItem(STORAGE_KEY, stored);

      const { width } = renderPanel();

      expect(width()).toBe(expected);
    });

    it('stores the width once the mouse is released, not while dragging', () => {
      const { probe } = renderPanel();

      pressHandle(probe, 100);
      moveTo(150);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      release();
      expect(localStorage.getItem(STORAGE_KEY)).toBe('290');
    });

    it('stores nothing when the handle is clicked without changing the width', () => {
      const { probe } = renderPanel();

      pressHandle(probe, 100);
      release();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('takes over the width another tab stores', () => {
      const { width } = renderPanel();

      act(() => {
        localStorage.setItem(STORAGE_KEY, '350');
        window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '350' }));
      });

      expect(width()).toBe('350px');
    });

    it('starts from the initial width while the browser storage is blocked, e.g. in a private window', () => {
      localStorage.setItem(STORAGE_KEY, '300');
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });

      const { width } = renderPanel();

      expect(width()).toBe('240px');
    });

    it('keeps the new width on screen when the browser storage is full', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });
      const { probe, width } = renderPanel();

      pressHandle(probe, 100);
      moveTo(150);
      release();

      expect(width()).toBe('290px');
    });
  });
});
