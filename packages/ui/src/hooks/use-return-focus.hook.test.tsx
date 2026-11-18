import { renderHook } from '@testing-library/react';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';
import { useReturnFocus } from './use-return-focus.hook';

describe('useReturnFocus', () => {
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  let canvas: HTMLElement;
  let dialogButton: HTMLButtonElement;

  beforeEach(() => {
    canvas = document.createElement('div');
    canvas.id = CanvasDefaults.CANVAS_MAIN_ID;
    canvas.tabIndex = -1;
    dialogButton = document.createElement('button');
    document.body.append(canvas, dialogButton);
  });

  afterEach(() => {
    canvas.remove();
    dialogButton.remove();
  });

  /** Opens and closes the modal, moving the focus into it like its focus trap does */
  const openAndClose = (origin: Element | null) => {
    (origin as HTMLElement | null)?.focus();
    const { rerender } = renderHook(
      ({ isOpen }) => {
        useReturnFocus(isOpen);
      },
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });
    dialogButton.focus();
    rerender({ isOpen: false });
  };

  it('returns the focus to the HTML element that had it when the modal opened', () => {
    const button = document.createElement('button');
    document.body.append(button);

    openAndClose(button);

    expect(button).toHaveFocus();
    button.remove();
  });

  it('returns the focus to the SVG element that had it when the modal opened', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const step = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    step.setAttribute('tabindex', '-1');
    svg.append(step);
    document.body.append(svg);

    openAndClose(step);

    expect(step).toHaveFocus();
    svg.remove();
  });

  it('moves the focus to the canvas when the element is gone after the modal closes', async () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const { rerender } = renderHook(
      ({ isOpen }) => {
        useReturnFocus(isOpen);
      },
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    dialogButton.focus();

    rerender({ isOpen: false });
    button.remove();
    await nextFrame();

    expect(canvas).toHaveFocus();
  });

  it('does not move the focus when something else has it after the modal closes', async () => {
    const button = document.createElement('button');
    const other = document.createElement('button');
    document.body.append(button, other);
    button.focus();
    const { rerender } = renderHook(
      ({ isOpen }) => {
        useReturnFocus(isOpen);
      },
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    dialogButton.focus();

    rerender({ isOpen: false });
    button.remove();
    other.focus();
    await nextFrame();

    expect(other).toHaveFocus();
    other.remove();
  });

  it('does not move the focus when nothing had it when the modal opened', async () => {
    (document.activeElement as HTMLElement).blur();

    openAndClose(null);
    dialogButton.blur();
    await nextFrame();

    expect(document.body).toHaveFocus();
  });
});
