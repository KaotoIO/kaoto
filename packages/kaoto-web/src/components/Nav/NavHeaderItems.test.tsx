import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { RouteConfigArray } from '../../types/routes';
import { NavHeaderItems } from './NavHeaderItems';

const renderItems = (routes: RouteConfigArray, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <nav>
        <NavHeaderItems routesInHeader={routes} currentPath={path} />
      </nav>
    </MemoryRouter>,
  );

describe('NavHeaderItems', () => {
  it('renders nothing when routes array is empty', () => {
    const { container } = renderItems([]);
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders a header menu item for a simple route', () => {
    const routes: RouteConfigArray = [{ path: '/dashboard', carbon: { label: 'Dashboard', inHeader: true } }];
    renderItems(routes, '/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('marks the active route as active', () => {
    const routes: RouteConfigArray = [{ path: '/dashboard', carbon: { label: 'Dashboard', inHeader: true } }];
    renderItems(routes, '/dashboard');
    // Carbon HeaderMenuItem sets aria-current="true" on the active item
    const item = screen.getByRole('link', { name: 'Dashboard' });
    expect(item).toHaveAttribute('aria-current', 'true');
  });

  it('renders a submenu when carbon.subMenu is set', () => {
    const routes: RouteConfigArray = [
      {
        path: '/parent',
        carbon: {
          label: 'Parent',
          inHeader: true,
          subMenu: [{ path: '/parent/child', carbon: { label: 'Child' } }],
        },
      },
    ];
    renderItems(routes, '/');
    // Carbon HeaderMenu renders as a link with aria-haspopup="menu"
    const menuTrigger = screen.getByRole('link', { name: /parent/i });
    expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('skips routes that are already in a sub-menu', () => {
    const routes: RouteConfigArray = [{ path: '/child', carbon: { label: 'Child', inSubMenu: true } }];
    const { container } = renderItems(routes, '/');
    expect(container.querySelector('a')).toBeNull();
  });
});
