import { act, render, screen } from '@testing-library/react';
import { useLocalStorage } from '../hooks/local-storage.hook';
import { Shell } from './Shell';

jest.mock('../hooks/local-storage.hook', () => ({
  useLocalStorage: jest.fn(),
}));

jest.mock('./Navigation', () => ({
  Navigation: ({ isNavOpen }: { isNavOpen: boolean }) => <div data-testid="navigation" data-is-open={isNavOpen}></div>,
}));

jest.mock('./TopBar', () => ({
  TopBar: ({ navToggle }: { navToggle: () => void }) => (
    <button title="button" type="button" data-testid="topbar" onClick={navToggle} />
  ),
}));

describe('Shell Component', () => {
  it('renders the Shell component with children', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);

    render(
      <Shell>
        <div data-testid="child">Child Content</div>
      </Shell>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('navigation')).toHaveAttribute('data-is-open', 'true');
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('toggles navigation state when navToggle is called', () => {
    const setIsNavOpenMock = jest.fn();
    (useLocalStorage as jest.Mock).mockReturnValue([true, setIsNavOpenMock]);

    render(<Shell />);

    act(() => {
      const topBarButton = screen.getByTestId('topbar');
      topBarButton.click();
    });

    expect(setIsNavOpenMock).toHaveBeenCalledWith(false);
  });

  it('renders navigation as closed when isNavOpen is false', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);

    render(<Shell />);

    expect(screen.getByTestId('navigation')).toHaveAttribute('data-is-open', 'false');
  });
});
