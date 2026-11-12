import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Router } from './index';

const renderRouter = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Router />
    </MemoryRouter>,
  );

describe('Router', () => {
  it('renders the dashboard on the index route', async () => {
    renderRouter('/');

    expect(await screen.findByText('Copyright IBM', { exact: false })).toBeInTheDocument();
  });

  it('renders the config page', async () => {
    renderRouter('/config');

    expect(await screen.findByTestId('config-page')).toBeInTheDocument();
  });

  it('renders the not found page for unknown routes', async () => {
    renderRouter('/does-not-exist');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
