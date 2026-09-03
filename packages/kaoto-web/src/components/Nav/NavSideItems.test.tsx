import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { RouteConfigArray } from '../../types/routes';
import { NavSideItems } from './NavSideItems';

const renderItems = (routes: RouteConfigArray, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <nav>
        <NavSideItems routesInSideNav={routes} currentPath={path} />
      </nav>
    </MemoryRouter>,
  );

describe('NavSideItems', () => {
  it('renders nothing when routes array is empty', () => {
    const { container } = renderItems([]);
    expect(container.querySelector('a')).toBeNull();
  });

  it('renders a side nav link for a simple route', () => {
    const routes: RouteConfigArray = [{ path: '/settings', carbon: { label: 'Settings', inSideNav: true } }];
    renderItems(routes, '/settings');
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('marks the active route with the active CSS class', () => {
    const routes: RouteConfigArray = [{ path: '/settings', carbon: { label: 'Settings', inSideNav: true } }];
    renderItems(routes, '/settings');
    // Carbon SideNavLink signals active state via the --current modifier class
    const link = screen.getByRole('link', { name: 'Settings' });
    expect(link.className).toMatch(/--current/);
  });

  it('renders an external href link when no path is provided', () => {
    const routes: RouteConfigArray = [{ index: true, carbon: { label: 'Docs', href: 'https://example.com' } }];
    renderItems(routes, '/');
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', 'https://example.com');
  });

  it('renders a sub-menu when carbon.subMenu is set', () => {
    const routes: RouteConfigArray = [
      {
        path: '/parent',
        carbon: {
          label: 'Parent',
          inSideNav: true,
          subMenu: [{ path: '/parent/child', carbon: { label: 'Child' } }],
        },
      },
    ];
    renderItems(routes, '/');
    expect(screen.getByRole('button', { name: 'Parent' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Child' })).toBeInTheDocument();
  });

  it('skips routes already in a sub-menu', () => {
    const routes: RouteConfigArray = [{ path: '/child', carbon: { label: 'Child', inSubMenu: true } }];
    const { container } = renderItems(routes, '/');
    expect(container.querySelector('a')).toBeNull();
  });
});
