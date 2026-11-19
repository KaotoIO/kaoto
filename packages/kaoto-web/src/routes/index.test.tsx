import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { resetTestIndexedDB } from '../test/indexed-db';
import { Router } from './index';

const CurrentLocation = () => <span data-testid="location">{useLocation().pathname}</span>;

const renderRouter = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Router />
      <CurrentLocation />
    </MemoryRouter>,
  );

describe('Router', () => {
  beforeEach(() => {
    resetTestIndexedDB();
  });

  it('starts in the workspace', async () => {
    renderRouter('/');

    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
    expect(screen.getByTestId('project-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace');
  });

  it('renders the dashboard', async () => {
    renderRouter('/dashboard');

    expect(await screen.findByText('Copyright IBM', { exact: false })).toBeInTheDocument();
  });

  it('renders the config page', async () => {
    renderRouter('/config');

    expect(await screen.findByTestId('config-page')).toBeInTheDocument();
  });

  it('renders the workspace', async () => {
    renderRouter('/workspace');

    expect(await screen.findByTestId('explorer-empty')).toBeInTheDocument();
    expect(screen.getByTestId('project-toolbar')).toBeInTheDocument();
  });

  it.each(['/projects/my-project', '/workspace/config'])('renders the not found page for %s', async (path) => {
    renderRouter(path);

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('renders the not found page for unknown routes', async () => {
    renderRouter('/does-not-exist');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
