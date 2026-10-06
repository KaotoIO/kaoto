import { render, screen, waitFor } from '@testing-library/react';
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

it('isolates tooltip annotation input from canvas selection, dragging and menus', async () => {
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
      <OverlayInteraction interaction={{ accessibleLabel: 'Count', tooltip: 'Message count' }} className="">
        42
      </OverlayInteraction>
    </div>,
  );
  const annotation = screen.getByRole('button', { name: 'Count' });
  await user.click(annotation);
  await user.dblClick(annotation);
  await user.pointer({ target: annotation, keys: '[MouseRight]' });
  annotation.focus();
  await user.keyboard('{Shift>}{F10}{/Shift}{Enter}');
  expect(onCanvasInput).not.toHaveBeenCalled();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('Message count');
});
