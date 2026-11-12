import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { IntegrationHeaderContext } from '../../context/IntegrationHeaderContext';
import { Nav } from './Nav';

const renderNav = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Nav />
    </MemoryRouter>,
  );

describe('Nav', () => {
  it('renders the header banner landmark', () => {
    renderNav();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the Kaoto logo image', () => {
    renderNav();
    expect(screen.getByAltText('Kaoto')).toBeInTheDocument();
  });

  it('renders the skip-to-content link', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('renders the menu toggle button', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('toggles the side nav when the menu button is clicked', async () => {
    renderNav();
    const button = screen.getByRole('button', { name: /open menu/i });
    await userEvent.click(button);
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
  });

  it('renders the Open Project link in the side nav', () => {
    renderNav();
    const link = screen.getByRole('link', { name: /open project/i });
    expect(link).toHaveAttribute('href', '/projects/project50');
  });

  it('closes the side nav when the Open Project link in the side nav is clicked', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();
    const sideNavLink = screen.getByRole('link', { name: /open project/i });
    await userEvent.click(sideNavLink);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });

  it('does not render the breadcrumb without an active integration', () => {
    renderNav();
    expect(screen.queryByTestId('nav-breadcrumb')).not.toBeInTheDocument();
  });

  it('renders the breadcrumb of the active integration', () => {
    render(
      <MemoryRouter>
        <IntegrationHeaderContext.Provider
          value={{
            breadcrumbItems: [{ label: 'my-project', href: '/projects/my-project' }],
            current: 'my-flow',
            viewMode: 'design',
            setViewMode: () => {},
            setBreadcrumbItems: () => {},
            setCurrent: () => {},
          }}
        >
          <Nav />
        </IntegrationHeaderContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('nav-breadcrumb')).toHaveTextContent('my-project');
    expect(screen.getByTestId('nav-breadcrumb')).toHaveTextContent('my-flow');
  });
});
