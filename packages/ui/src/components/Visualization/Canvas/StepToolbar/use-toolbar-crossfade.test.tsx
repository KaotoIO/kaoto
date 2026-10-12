import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';

import { useToolbarCrossfade } from './use-toolbar-crossfade';

const onClick = vi.fn();
const MeasuredToolbar = ({ id, x }: { id: string; x: number }) => {
  const [offset, setOffset] = useState(0);
  return (
    <foreignObject x={x + offset} data-testid="position">
      <div>
        <button
          id="toolbar-action"
          onClick={() => {
            onClick();
            setOffset(5);
          }}
        >
          {id}
        </button>
      </div>
    </foreignObject>
  );
};
const Toolbar = ({ id, x = 0 }: { id?: string; x?: number }) => {
  const { activeRef, outgoingRef } = useToolbarCrossfade(id);
  return id ? (
    <svg>
      <g ref={outgoingRef} data-testid="outgoing" aria-hidden="true" />
      <g ref={activeRef} data-testid="active">
        <MeasuredToolbar id={id} x={x} />
      </g>
    </svg>
  ) : null;
};

describe('useToolbarCrossfade', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    onClick.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('crossfades simultaneously at fixed positions with only one interactive toolbar', async () => {
    const { rerender } = render(<Toolbar id="a" x={10} />);
    expect(screen.getByTestId('active')).toHaveAttribute('opacity', '1');
    rerender(<Toolbar id="b" x={210} />);
    const outgoing = screen.getByTestId('outgoing');
    const active = screen.getByTestId('active');
    expect(outgoing).toHaveTextContent('a');
    expect(outgoing).toContainHTML('x="10"');
    expect(outgoing).toContainHTML('inert=""');
    expect(outgoing).not.toContainHTML('id="toolbar-action"');
    expect(outgoing).toHaveAttribute('opacity', '1');
    expect(active).toHaveAttribute('opacity', '0');
    expect(screen.getByTestId('position')).toHaveAttribute('x', '210');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(within(outgoing).getByText('a'));
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'b' }));
    expect(onClick).toHaveBeenCalledOnce();
    await act(() => vi.advanceTimersByTime(32));
    const opacity = Number(active.getAttribute('opacity'));
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(Number(outgoing.getAttribute('opacity'))).toBeCloseTo(1 - opacity);
    expect(screen.getByTestId('position')).toHaveAttribute('x', '215');
    await act(() => vi.advanceTimersByTime(48));
    expect(outgoing).toBeEmptyDOMElement();
    expect(active).toHaveAttribute('opacity', '1');
  });

  it('replaces interrupted fades and cancels frames on unmount', async () => {
    const { rerender, unmount } = render(<Toolbar id="a" />);
    rerender(<Toolbar id="b" />);
    await act(() => vi.advanceTimersByTime(64));
    const opacity = screen.getByTestId('active').getAttribute('opacity');
    rerender(<Toolbar id="c" />);
    expect(screen.getByTestId('outgoing')).toHaveTextContent('b');
    expect(screen.getByTestId('outgoing')).toHaveAttribute('opacity', opacity);
    await act(() => vi.advanceTimersByTime(180));
    expect(screen.getByTestId('outgoing')).toBeEmptyDOMElement();
    rerender(<Toolbar id="d" />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not fade layout changes, dismissal or reopening', () => {
    const { rerender } = render(<Toolbar id="a" />);
    rerender(<Toolbar id="a" x={100} />);
    expect(screen.getByTestId('outgoing')).toBeEmptyDOMElement();
    expect(screen.getByTestId('position')).toHaveAttribute('x', '100');
    rerender(<Toolbar id="b" />);
    expect(screen.getByTestId('outgoing')).toContainHTML('x="100"');
    rerender(<Toolbar />);
    expect(screen.queryByTestId('outgoing')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    rerender(<Toolbar id="c" />);
    expect(screen.getByTestId('active')).toHaveAttribute('opacity', '1');
    expect(screen.getByTestId('outgoing')).toBeEmptyDOMElement();
  });

  it('captures measurements updated inside the toolbar before changing targets', () => {
    // The shared test setup replaces MutationObserver with a no-op implementation.
    let notify: MutationCallback;
    const observer = { observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn() };
    vi.spyOn(globalThis, 'MutationObserver').mockImplementation(function (callback) {
      notify = callback;
      return observer;
    });
    const { rerender } = render(<Toolbar id="a" x={10} />);
    fireEvent.click(screen.getByRole('button', { name: 'a' }));
    expect(screen.getByTestId('position')).toHaveAttribute('x', '15');
    notify!([{ target: screen.getByTestId('position') } as unknown as MutationRecord], observer);
    rerender(<Toolbar id="b" x={210} />);
    expect(screen.getByTestId('outgoing')).toContainHTML('x="15"');
  });

  it('respects reduced motion', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    const { rerender } = render(<Toolbar id="a" />);
    rerender(<Toolbar id="b" />);
    expect(screen.getByTestId('outgoing')).toBeEmptyDOMElement();
    expect(screen.getByTestId('active')).toHaveAttribute('opacity', '1');
    expect(vi.getTimerCount()).toBe(0);
  });
});
