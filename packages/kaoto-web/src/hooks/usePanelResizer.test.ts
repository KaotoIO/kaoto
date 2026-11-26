import { act, render } from '@testing-library/react';
import { createElement, MouseEvent as ReactMouseEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { usePanelResizer } from './usePanelResizer';

const CSS_VARIABLE = '--test-panel-inline-size';
const OPTIONS = { cssVariable: CSS_VARIABLE, initialWidth: 240, minWidth: 160, maxWidth: 480 };

interface PanelProbe {
  handleResizerMouseDown?: (event: ReactMouseEvent) => void;
  renders: number;
}

/** Renders an element that carries the variable, and counts the renders of the component holding the hook */
const renderPanel = () => {
  const probe: PanelProbe = { renders: 0 };
  const Panel = () => {
    const { widthVariableElementRef, handleResizerMouseDown } = usePanelResizer(OPTIONS);
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
    release();

    expect(probe.renders).toBe(rendersBefore);
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
});
