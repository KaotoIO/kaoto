import { act, render, screen } from '@testing-library/react';
import { Mock, vi } from 'vitest';

import { useLocalStorage } from '../hooks/local-storage.hook';
import { Shell } from './Shell';

vi.mock('../hooks/local-storage.hook', () => ({
  useLocalStorage: vi.fn(),
}));

vi.mock('./Navigation', () => ({
  Navigation: ({ isNavOpen }: { isNavOpen: boolean }) => <div data-testid="navigation" data-is-open={isNavOpen}></div>,
}));

vi.mock('./TopBar', () => ({
  TopBar: ({ navToggle }: { navToggle: () => void }) => (
    <button title="button" type="button" data-testid="topbar" onClick={navToggle} />
  ),
}));

describe('Shell', () => {
  const originalInnerWidth = globalThis.innerWidth;
  const mockSetNavOpen = vi.fn();

  const setWindowWidth = (width: number) => {
    Object.defineProperty(globalThis, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useLocalStorage as Mock).mockReturnValue([true, mockSetNavOpen]);
  });

  afterEach(() => {
    setWindowWidth(originalInnerWidth);
  });

  it('renders children', () => {
    render(
      <Shell>
        <div data-testid="child">Child Content</div>
      </Shell>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('toggles navigation when button is clicked', () => {
    render(<Shell />);

    act(() => {
      screen.getByTestId('topbar').click();
    });

    expect(mockSetNavOpen).toHaveBeenCalledWith(false);
  });

  it.each([
    ['desktop', 1200, true],
    ['wide desktop', 1920, true],
    ['just below breakpoint', 1199, false],
    ['tablet', 768, false],
    ['mobile', 375, false],
  ])('defaults to %s behavior at %dpx', (_, width, expectedDefault) => {
    setWindowWidth(width);

    render(<Shell />);

    expect(useLocalStorage).toHaveBeenCalledWith(expect.any(String), expectedDefault);
  });
});
