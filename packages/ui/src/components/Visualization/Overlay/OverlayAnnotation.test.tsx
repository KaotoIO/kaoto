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
      expect(screen.getByRole('button', { name: 'Duration metric: <img src=x onerror=alert(1)>' })).toBeInTheDocument();
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

  it('keeps annotations without a tooltip passive and out of keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <>
        <OverlayAnnotation entry={{ ...entry, interaction: { accessibleLabel: 'Plain metric' } }} />
        <button>Next control</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
    await user.hover(screen.getByRole('img', { name: 'Plain metric: Duration 0 ms' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
  it('keeps keyboard focus when a live metric and its tooltip update', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OverlayAnnotation entry={entry} />);
    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Duration 0 ms');
    rerender(
      <OverlayAnnotation
        entry={{ ...entry, value: 42, interaction: { ...entry.interaction, tooltip: 'Updated measurement' } }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Duration metric: Duration 42 ms' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Updated measurement');
  });
  it.each([
    ['abcdefghijklmnopqrstuvwx', 'abcdefghijklmnopqrstuvwx'],
    ['abcdefghijklmnopqrstuvwxy', 'abcdefghijklmnopqrstu...'],
    ['abcdefghijklmnopqrst👨‍👩‍👧‍👦uvwx', 'abcdefghijklmnopqrst👨‍👩‍👧‍👦...'],
    ['abcdefghijklmnopqrstéuvwx', 'abcdefghijklmnopqrsté...'],
  ])('limits visible text without splitting characters: %s', (text, visible) => {
    render(<OverlayAnnotation entry={{ ...entry, text, value: undefined, unit: undefined }} />);
    expect(screen.getByText(visible)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Duration metric: ${text}` })).toBeInTheDocument();
  });

  it('automatically exposes the full formatted value when the length limit is exceeded', async () => {
    const user = userEvent.setup();
    render(
      <OverlayAnnotation
        entry={{
          ...entry,
          text: 'abcdefghijklmnopqrst',
          value: 123,
          unit: 'ms',
          interaction: { accessibleLabel: 'Metric' },
        }}
      />,
    );
    expect(screen.getByText('abcdefghijklmnopqrst ...')).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Metric: abcdefghijklmnopqrst 123 ms' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('abcdefghijklmnopqrst 123 ms');
  });
});
