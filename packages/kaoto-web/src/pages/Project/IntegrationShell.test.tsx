import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import IntegrationShell from './IntegrationShell';

const renderComponent = (projectId = 'my-project', integrationId = 'main-flow') =>
  render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/integration/${integrationId}`]}>
      <Routes>
        <Route path="/projects/:projectId/integration/:integrationId" element={<IntegrationShell />} />
      </Routes>
    </MemoryRouter>,
  );

describe('IntegrationShell', () => {
  it.each(['integration-shell', 'integration-shell-toolbar', 'integration-body'])('renders %s', (testId) => {
    renderComponent();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it('renders breadcrumb with projectId and integrationId', () => {
    renderComponent('my-project', 'main-flow');
    expect(screen.getByRole('link', { name: 'my-project' })).toBeInTheDocument();
    expect(screen.getByText('main-flow')).toBeInTheDocument();
  });

  it('renders the view switcher with Design/Code/Topology options', () => {
    renderComponent();
    expect(screen.getByTestId('view-mode-design')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-code')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-topology')).toBeInTheDocument();
  });

  it('has Design selected by default', () => {
    renderComponent();
    expect(screen.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches view mode on click', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('tab', { name: 'Topology' }));
    expect(screen.getByRole('tab', { name: 'Topology' })).toHaveAttribute('aria-selected', 'true');
  });

  it('redirects to the root for invalid params', () => {
    render(
      <MemoryRouter initialEntries={['/projects/my-project/integration/INVALID%20ID']}>
        <Routes>
          <Route path="/" element={<div data-testid="root-page" />} />
          <Route path="/projects/:projectId/integration/:integrationId" element={<IntegrationShell />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('root-page')).toBeInTheDocument();
    expect(screen.queryByTestId('integration-shell')).not.toBeInTheDocument();
  });
});
