import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

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
});
