import { render, screen, within } from '@testing-library/react';
import { lazy, ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { RootLayout } from './RootLayout';

describe('RootLayout', () => {
  const renderWithRouter = (initialPath = '/') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<div data-testid="child-content">Dashboard</div>} />
            <Route path="about" element={<div data-testid="child-content">About</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

  it('renders the Carbon Header nav bar', () => {
    renderWithRouter('/');
    // Carbon Header renders a <header> element
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders child route content via Outlet', () => {
    renderWithRouter('/');
    expect(screen.getByTestId('child-content')).toHaveTextContent('Dashboard');
  });

  it('renders different child routes correctly', () => {
    renderWithRouter('/about');
    expect(screen.getByTestId('child-content')).toHaveTextContent('About');
  });

  it('renders the Content element with id="main-content" for SkipToContent', () => {
    renderWithRouter('/');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('renders the loader overlay inside the main content while a lazy route loads', async () => {
    const LazyPage = lazy(() => new Promise<{ default: () => ReactElement }>(() => {}));
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<LazyPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const overlay = await screen.findByRole('dialog', { name: 'Loading' });
    expect(screen.getByRole('main')).toContainElement(overlay);
    expect(within(overlay).getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });
});
