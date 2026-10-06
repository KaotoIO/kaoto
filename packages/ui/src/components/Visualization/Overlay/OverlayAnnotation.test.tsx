import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayEntry } from './overlay-entries';
import { OverlayAnnotation } from './OverlayAnnotation';

vi.unmock('@patternfly/react-icons');

const entry: Extract<OverlayEntry, { kind: 'annotation' }> = {
  id: 'metric',
  kind: 'annotation',
  target: { kind: 'edge', id: 'edge-1' },
  text: 'Duration',
  value: 0,
  unit: 'ms',
  interaction: { accessibleLabel: 'Duration metric', tooltip: 'Measured locally' },
};

describe('Overlay annotations', () => {
  it.each(['node', 'edge', 'route'] as const)(
    'renders %s content including zero, negatives and literal HTML safely',
    (kind) => {
      const { rerender, container } = render(
        <OverlayAnnotation entry={{ ...entry, target: { kind, id: 'target' } }} />,
      );
      expect(screen.getByText('Duration 0 ms')).toBeInTheDocument();
      rerender(<OverlayAnnotation entry={{ ...entry, text: '', value: -2.75 }} />);
      expect(screen.getByText('-2.75 ms')).toBeInTheDocument();
      rerender(
        <OverlayAnnotation entry={{ ...entry, text: '<img src=x onerror=alert(1)>', value: undefined, unit: '' }} />,
      );
      expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
      expect(container.querySelector('img')).toBeNull();
      expect(entry.value).toBe(0);
    },
  );

  it('exposes full text and consumer details in a portaled tooltip', async () => {
    const user = userEvent.setup();
    render(
      <svg>
        <foreignObject width={160} height={32}>
          <OverlayAnnotation
            entry={{ ...entry, text: 'A very long annotation that exceeds the available canvas space' }}
          />
        </foreignObject>
      </svg>,
    );
    await user.tab();
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent('A very long annotation that exceeds the available canvas space 0 ms');
    expect(tooltip).toHaveTextContent('Measured locally');
    expect(tooltip.closest('foreignObject')).toBeNull();
  });

  it('dispatches the route identity from an annotation menu', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <OverlayAnnotation
        entry={{
          ...entry,
          target: { kind: 'route', id: 'route-1' },
          interaction: {
            accessibleLabel: 'Route metric',
            contextMenu: [{ id: 'inspect', label: 'Inspect', enabled: true }],
          },
        }}
        onAction={onAction}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Route metric/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Inspect' }));
    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      entryId: 'metric',
      target: { kind: 'route', id: 'route-1' },
      actionId: 'inspect',
    });
  });
});
