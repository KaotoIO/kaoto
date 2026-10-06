import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayEntry } from './overlay-entries';
import { OverlayMarker } from './OverlayMarker';

vi.unmock('@patternfly/react-icons');

const entry: Extract<OverlayEntry, { kind: 'marker' }> = {
  id: 'marker',
  kind: 'marker',
  target: { kind: 'node', id: 'step' },
  icon: 'circle',
  emphasis: 'subdued',
  interaction: {
    accessibleLabel: 'Example marker',
    tooltip: 'Details',
    contextMenu: [
      { id: 'inspect', label: 'Inspect', enabled: true },
      { id: 'edit', label: 'Edit', enabled: false },
      { id: 'remove', label: 'Remove', enabled: true },
    ],
  },
};

describe('Overlay marker interactions', () => {
  it('isolates pointer and portal events, keeps subdued actions enabled and returns detached identity', async () => {
    const user = userEvent.setup();
    const parent = vi.fn();
    const onAction = vi.fn();
    render(
      <div onClick={parent} onContextMenu={parent} onPointerDown={parent} onMouseDown={parent}>
        <svg>
          <foreignObject width={32} height={32}>
            <OverlayMarker entry={entry} onAction={onAction} />
          </foreignObject>
        </svg>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Example marker' }));
    const disabled = screen.getByRole('menuitem', { name: 'Edit' });
    expect(disabled).toBeDisabled();
    await user.click(disabled);
    expect(onAction).not.toHaveBeenCalled();
    const inspect = screen.getByRole('menuitem', { name: 'Inspect' });
    expect(inspect.closest('foreignObject')).toBeNull();
    await user.click(inspect);
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      entryId: 'marker',
      target: { kind: 'node', id: 'step' },
      actionId: 'inspect',
    });
    expect(onAction.mock.calls[0][0].target).not.toBe(entry.target);
    expect(parent).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('supports keyboard navigation, escape focus restoration and Tab exit without canvas keys', async () => {
    const user = userEvent.setup();
    const parent = vi.fn();
    render(
      <div onKeyDown={parent} onKeyUp={parent}>
        <OverlayMarker entry={entry} onAction={vi.fn()} />
      </div>,
    );
    const toggle = screen.getByRole('button', { name: 'Example marker' });
    await user.tab();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Inspect' })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Remove' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.keyboard(' ');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Inspect' })).toHaveFocus());
    // user-event computes Tab's destination from the original portaled target; verify
    // the default is preserved here, and actual browser Tab order in the gallery.
    expect(fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Inspect' }), { key: 'Tab' })).toBe(true);
    expect(toggle).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(parent).not.toHaveBeenCalled();
  });

  it.each(['context', 'ContextMenu', 'ShiftF10'])('opens by %s', async (method) => {
    render(<OverlayMarker entry={entry} onAction={vi.fn()} />);
    const toggle = screen.getByRole('button', { name: 'Example marker' });
    if (method === 'context') fireEvent.contextMenu(toggle);
    else fireEvent.keyDown(toggle, { key: method === 'ShiftF10' ? 'F10' : method, shiftKey: method === 'ShiftF10' });
    expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeInTheDocument();
  });

  it.each(['disabled', 'removed', 'identity', 'target'] as const)(
    'closes obsolete menus on %s changes',
    async (change) => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const { rerender, unmount } = render(<OverlayMarker entry={entry} onAction={onAction} />);
      await user.click(screen.getByRole('button', { name: 'Example marker' }));
      const obsoleteItem = screen.getByRole('menuitem', { name: 'Inspect' });
      const updated = structuredClone(entry);
      if (change === 'disabled') updated.interaction.contextMenu![0].enabled = false;
      if (change === 'removed') updated.interaction.contextMenu = [];
      if (change === 'identity') updated.id = 'new-marker';
      if (change === 'target') updated.target.id = 'new-step';
      rerender(<OverlayMarker entry={updated} onAction={onAction} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      fireEvent.click(obsoleteItem);
      expect(onAction).not.toHaveBeenCalled();
      rerender(<OverlayMarker entry={entry} onAction={onAction} />);
      await user.click(screen.getByRole('button', { name: 'Example marker' }));
      unmount();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    },
  );

  it('disables actions without a callback', async () => {
    const user = userEvent.setup();
    render(<OverlayMarker entry={entry} />);
    await user.click(screen.getByRole('button', { name: 'Example marker' }));
    expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeDisabled();
  });

  it('exposes tooltip-only entries to keyboard and pointer users, without tab stops for passive entries', async () => {
    const user = userEvent.setup();
    const tooltipEntry = { ...entry, interaction: { accessibleLabel: 'Flag', tooltip: 'Flag details' } };
    const { rerender } = render(<OverlayMarker entry={tooltipEntry} />);
    await user.tab();
    expect(screen.getByLabelText('Flag')).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Flag details');
    await user.tab();
    await user.hover(screen.getByLabelText('Flag'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Flag details');
    rerender(<OverlayMarker entry={{ ...entry, icon: 'unknown', interaction: { accessibleLabel: 'Unknown' } }} />);
    expect(screen.getByLabelText('Unknown (unknown marker icon)')).not.toHaveAttribute('tabindex', '0');
  });
});
