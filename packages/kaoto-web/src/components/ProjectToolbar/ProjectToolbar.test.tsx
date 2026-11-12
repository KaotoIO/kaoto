import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import { ProjectContext } from '../../context/ProjectContext';
import { RuntimeProvider } from '../../context/RuntimeProvider';
import { ProjectToolbar } from './ProjectToolbar';

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

  describe('with an active integration', () => {
    const ViewModeProvider = ({ children }: { children: React.ReactNode }) => {
      const [viewMode, setViewMode] = useState<ViewMode>('design');
      const value = useMemo(
        () => ({
          breadcrumbItems: [],
          current: 'my-flow',
          viewMode,
          setViewMode,
          setBreadcrumbItems: () => {},
          setCurrent: () => {},
        }),
        [viewMode],
      );
      return (
        <IntegrationHeaderContext.Provider value={value}>
          {children}
          <output data-testid="view-mode">{viewMode}</output>
        </IntegrationHeaderContext.Provider>
      );
    };

    const renderWithIntegration = () =>
      render(
        <MemoryRouter>
          <ProjectContext.Provider value={{ projectId: 'my-project' }}>
            <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
              <ViewModeProvider>
                <ProjectToolbar />
              </ViewModeProvider>
            </RuntimeProvider>
          </ProjectContext.Provider>
        </MemoryRouter>,
      );

    it('does not render the view mode switcher without an active integration', () => {
      renderComponent();
      expect(screen.queryByTestId('integration-shell-switcher')).not.toBeInTheDocument();
    });

    it('renders the view mode switcher and changes the view mode', async () => {
      const user = userEvent.setup();
      renderWithIntegration();
      expect(screen.getByTestId('integration-shell-switcher')).toBeInTheDocument();
      expect(screen.getByTestId('view-mode')).toHaveTextContent('design');

      await user.click(screen.getByTestId('view-mode-code'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('code');

      await user.click(screen.getByTestId('view-mode-topology'));
      expect(screen.getByTestId('view-mode')).toHaveTextContent('topology');
    });
  });
});
