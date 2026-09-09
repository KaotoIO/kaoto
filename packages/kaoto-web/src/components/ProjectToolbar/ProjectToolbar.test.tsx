import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ProjectContext } from '../../context/ProjectContext';
import { RuntimeProvider } from '../../context/RuntimeProvider';
import { ProjectToolbar } from './ProjectToolbar';

vi.mock('./AppMenuDropdown/AppMenuDropdown', () => ({
  AppMenuDropdown: () => <div data-testid="app-menu-dropdown" />,
}));
vi.mock('./SelectedRuntime/SelectedRuntime', () => ({
  SelectedRuntime: () => <div data-testid="runtime-selector-display" />,
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <ProjectContext.Provider value={{ projectId: 'my-project' }}>
        <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
          <ProjectToolbar />
        </RuntimeProvider>
      </ProjectContext.Provider>
    </MemoryRouter>,
  );

describe('ProjectToolbar', () => {
  it.each([
    ['project-toolbar', 'renders with the correct data-testid'],
    ['app-menu-dropdown', 'renders the AppMenuDropdown'],
    ['runtime-selector-display', 'renders the SelectedRuntime'],
  ])('getByTestId("%s") — %s', (testId) => {
    renderComponent();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it.each([
    ['Undo', /undo/i],
    ['Redo', /redo/i],
  ])('renders the %s button as disabled', (_label, name) => {
    renderComponent();
    expect(screen.getByRole('button', { name })).toBeDisabled();
  });
});
