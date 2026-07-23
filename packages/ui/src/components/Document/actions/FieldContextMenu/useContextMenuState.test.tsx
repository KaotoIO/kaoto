import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, MouseEvent, useCallback } from 'react';

import { useContextMenuState } from './useContextMenuState';

const TestComponent: FunctionComponent = () => {
  const { isMenuOpen, menuPosition, menuRef, closeMenu, openMenu } = useContextMenuState();

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      openMenu(event);
    },
    [openMenu],
  );

  return (
    <>
      <div data-testid="trigger" onContextMenu={handleContextMenu}>
        Trigger
      </div>
      {isMenuOpen && (
        <div ref={menuRef} data-testid="menu" style={{ position: 'fixed', left: menuPosition.x, top: menuPosition.y }}>
          <button onClick={closeMenu}>Menu Item</button>
        </div>
      )}
    </>
  );
};

describe('useContextMenuState', () => {
  it('should open menu on context menu event', () => {
    render(<TestComponent />);

    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByTestId('menu')).toBeInTheDocument();
  });

  it('should close menu when clicking outside', () => {
    render(<TestComponent />);

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByTestId('menu')).toBeInTheDocument();

    fireEvent.mouseDown(globalThis.document.body);

    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });

  it('should close menu when pressing Escape', () => {
    render(<TestComponent />);

    fireEvent.contextMenu(screen.getByTestId('trigger'));

    expect(screen.getByTestId('menu')).toBeInTheDocument();

    fireEvent.keyDown(globalThis.document, { key: 'Escape' });

    expect(screen.queryByTestId('menu')).not.toBeInTheDocument();
  });
});
