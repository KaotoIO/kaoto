import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { CanvasDefaults } from '../components/Visualization/Canvas/canvas.defaults';
import { LocalStorageKeys } from '../models';
import { TestProvidersWrapper } from '../stubs/TestProvidersWrapper';
import { Shell } from './Shell';

describe('Shell', () => {
  const originalInnerWidth = globalThis.innerWidth;
  let EntitiesProvider: Awaited<ReturnType<typeof TestProvidersWrapper>>['Provider'];

  /** Renders with what the real TopBar and Navigation need: a router and the entities context */
  const render = (ui: ReactElement) =>
    rtlRender(ui, {
      wrapper: ({ children }: PropsWithChildren) => (
        <MemoryRouter>
          <EntitiesProvider>{children}</EntitiesProvider>
        </MemoryRouter>
      ),
    });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(globalThis, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
  };

  beforeEach(async () => {
    ({ Provider: EntitiesProvider } = await TestProvidersWrapper());
    /* The navigation starts expanded */
    localStorage.setItem(LocalStorageKeys.NavigationExpanded, 'true');
  });

  afterEach(() => {
    setWindowWidth(originalInnerWidth);
    localStorage.removeItem(LocalStorageKeys.NavigationExpanded);
  });

  it('renders a PatternFly SkipToContent link targeting #canvas-main', () => {
    render(<Shell />);

    const skipLink = screen.getByRole('link', { name: 'Skip to canvas' });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', `#${CanvasDefaults.CANVAS_MAIN_ID}`);
  });

  it('focuses the canvas element when the skip link is clicked', () => {
    // Create a mock canvas element with the expected id so focus can be verified
    const canvasEl = document.createElement('div');
    canvasEl.id = CanvasDefaults.CANVAS_MAIN_ID;
    canvasEl.tabIndex = 0;
    document.body.appendChild(canvasEl);
    const focusSpy = vi.spyOn(canvasEl, 'focus');

    render(<Shell />);

    const skipLink = screen.getByRole('link', { name: 'Skip to canvas' });
    fireEvent.click(skipLink);

    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(canvasEl);
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

    expect(document.querySelector('#vertical-sidebar')).toHaveClass('pf-m-expanded');

    act(() => {
      screen.getByRole('button', { name: 'Global navigation' }).click();
    });

    expect(localStorage.getItem(LocalStorageKeys.NavigationExpanded)).toBe('false');
    expect(document.querySelector('#vertical-sidebar')).toHaveClass('pf-m-collapsed');
  });

  it.each([
    ['desktop', 1200, true],
    ['wide desktop', 1920, true],
    ['just below breakpoint', 1199, false],
    ['tablet', 768, false],
    ['mobile', 375, false],
  ])('defaults to %s behavior at %dpx', (_, width, expectedDefault) => {
    setWindowWidth(width);
    /* Nothing stored yet, so the width based default is used and persisted */
    localStorage.removeItem(LocalStorageKeys.NavigationExpanded);

    render(<Shell />);

    expect(localStorage.getItem(LocalStorageKeys.NavigationExpanded)).toBe(String(expectedDefault));
  });
});
