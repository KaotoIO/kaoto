import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayInteraction } from './OverlayInteraction';

vi.unmock('@patternfly/react-icons');

it('dismisses a focused tooltip with Escape without moving focus', async () => {
  const user = userEvent.setup();
  render(
    <OverlayInteraction interaction={{ accessibleLabel: 'Detail', tooltip: 'Supplementary information' }} className="">
      Info
    </OverlayInteraction>,
  );
  await user.tab();
  expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Detail' })).toHaveFocus();
});

it.each([true, false])(
  'isolates annotation input from canvas selection, dragging and menus (tooltip: %s)',
  async (withTooltip) => {
    const user = userEvent.setup();
    const onCanvasInput = vi.fn();
    render(
      <div
        onClick={onCanvasInput}
        onDoubleClick={onCanvasInput}
        onPointerDown={onCanvasInput}
        onKeyDown={onCanvasInput}
        onContextMenu={onCanvasInput}
      >
        <OverlayInteraction
          interaction={{ accessibleLabel: 'Count', tooltip: withTooltip ? 'Message count' : undefined }}
          className=""
        >
          42
        </OverlayInteraction>
      </div>,
    );
    const annotation = screen.getByRole(withTooltip ? 'button' : 'img', { name: 'Count' });
    await user.click(annotation);
    await user.dblClick(annotation);
    await user.pointer({ target: annotation, keys: '[MouseRight]' });
    annotation.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}{Enter}');
    expect(onCanvasInput).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    if (withTooltip) expect(await screen.findByRole('tooltip')).toHaveTextContent('Message count');
    else expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  },
);

it('isolates portaled tooltip input from the canvas', async () => {
  const user = userEvent.setup();
  const onCanvasInput = vi.fn();
  render(
    <div onClick={onCanvasInput} onPointerDown={onCanvasInput} onContextMenu={onCanvasInput}>
      <OverlayInteraction
        interaction={{ accessibleLabel: 'Detail', tooltip: 'Supplementary information' }}
        className=""
      >
        Info
      </OverlayInteraction>
    </div>,
  );
  await user.tab();
  const tooltip = await screen.findByRole('tooltip');
  fireEvent.click(tooltip);
  fireEvent.pointerDown(tooltip);
  fireEvent.contextMenu(tooltip);
  expect(onCanvasInput).not.toHaveBeenCalled();
});
