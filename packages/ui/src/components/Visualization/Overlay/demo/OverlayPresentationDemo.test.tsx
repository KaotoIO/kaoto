import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';

import { OverlayPresentationDemo } from './OverlayPresentationDemo';
import { useOverlayDemo } from './use-overlay-demo';

vi.unmock('@patternfly/react-icons');

const mainRoute = () => screen.getByLabelText('route-1837 with nested choice branches and an explicit message path');
const highlighted = (id: string) =>
  mainRoute().querySelector(`[data-demo-node="${id}"] rect.kaoto-overlay, [data-demo-edge="${id}"] path.kaoto-overlay`);

describe('Store-backed overlay demo', () => {
  it('ignores actions from an old session after reset', () => {
    const { result } = renderHook(() => useOverlayDemo());
    const oldActions = result.current.actions!;
    act(() => {
      result.current.reset();
    });
    act(() => {
      oldActions.disconnectMetrics();
    });
    expect(result.current.metricsConnected).toBe(true);
    expect(result.current.layers).toHaveLength(3);
    act(() => {
      oldActions.clearPath();
    });
    expect(result.current.branch).toBe('when');
    expect(result.current.overlays.filter(({ entry }) => entry.kind === 'highlight')).toHaveLength(7);
  });

  it('replaces the selected branch without losing metrics or the shared path', async () => {
    const user = userEvent.setup();
    render(<OverlayPresentationDemo />);
    expect(highlighted('to-1402')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show otherwise path' }));
    expect(highlighted('to-1402')).toBeNull();
    expect(highlighted('when-2399-to-1402')).toBeNull();
    expect(highlighted('to-1402-choice-exit')).toBeNull();
    expect(highlighted('to-3904')).not.toBeNull();
    expect(highlighted('otherwise-3621-to-3904')).not.toBeNull();
    expect(highlighted('to-3904-choice-exit')).not.toBeNull();
    expect(highlighted('from-1199')).not.toBeNull();
    expect(highlighted('to-2430')).not.toBeNull();
    expect(within(mainRoute()).getByRole('button', { name: 'from-1199 message count: 42' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear path' }));
    expect(mainRoute().querySelector('path.kaoto-overlay, rect.kaoto-overlay')).toBeNull();
    expect(
      within(mainRoute()).getByRole('button', { name: 'route-1837 annotation: Route total 12.5 ms' }),
    ).toBeInTheDocument();
  });

  it('updates and removes counts independently of the timings layer and path owner', async () => {
    const user = userEvent.setup();
    render(<OverlayPresentationDemo />);
    await user.click(screen.getByRole('button', { name: 'Update counts' }));
    await user.click(screen.getByRole('button', { name: 'Update counts' }));
    expect(within(mainRoute()).getByRole('button', { name: 'from-1199 message count: 44' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove XMPP count' }));
    expect(within(mainRoute()).queryByRole('button', { name: /to-3904 message count/ })).not.toBeInTheDocument();
    expect(within(mainRoute()).getByRole('button', { name: 'to-1402 message count: 44' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear counts' }));
    expect(mainRoute().querySelector('.kaoto-overlay-demo__step-annotation')).toBeNull();
    expect(
      within(mainRoute()).getByRole('button', { name: 'edge metric annotation: Edge duration 2.75 ms' }),
    ).toBeInTheDocument();
    expect(highlighted('to-1402')).not.toBeNull();
  });

  it('disposes all metrics layers without touching the path and restores a fresh demo on reset', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <OverlayPresentationDemo />
      </StrictMode>,
    );
    await user.click(screen.getByRole('button', { name: 'Disconnect metrics' }));
    expect(mainRoute().querySelector('[data-demo-group="route-1837"] .kaoto-overlay-annotation')).toBeNull();
    expect(highlighted('to-1402')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Update counts' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Show otherwise path' }));
    expect(highlighted('to-3904')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset demo' }));
    expect(highlighted('to-3904')).toBeNull();
    expect(highlighted('to-1402')).not.toBeNull();
    expect(within(mainRoute()).getByRole('button', { name: 'from-1199 message count: 42' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update counts' })).toBeEnabled();
  });
});
