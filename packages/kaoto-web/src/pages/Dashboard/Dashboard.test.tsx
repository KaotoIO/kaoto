import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import Dashboard from './Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );

describe('Dashboard', () => {
  it('renders the Dashboard page heading', async () => {
    renderDashboard();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the footer', async () => {
    renderDashboard();
    expect(await screen.findByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the copyright notice', async () => {
    renderDashboard();
    const year = new Date().getFullYear();
    expect(await screen.findByText(`Copyright IBM ${year}`)).toBeInTheDocument();
  });
});
