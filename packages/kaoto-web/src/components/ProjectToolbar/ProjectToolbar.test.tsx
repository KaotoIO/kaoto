import { RouteVisualizationUndoRedo } from '@kaoto/kaoto/components';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { EditorHistoryContext } from '../../context/EditorHistoryContextDefinition';
import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import { RuntimeProvider } from '../../context/RuntimeProvider';
import { ProjectToolbar } from './ProjectToolbar';

const renderComponent = () =>
  render(
    <MemoryRouter>
      <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
        <ProjectToolbar />
      </RuntimeProvider>
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
    const ViewModeProvider = ({ children, current }: { children: React.ReactNode; current: string }) => {
      const [viewMode, setViewMode] = useState<ViewMode>('design');
      const value = useMemo(
        () => ({
          breadcrumbItems: [],
          current,
          viewMode,
          setViewMode,
          setBreadcrumbItems: () => {},
          setCurrent: () => {},
        }),
        [viewMode, current],
      );
      return (
        <IntegrationHeaderContext.Provider value={value}>
          {children}
          <output data-testid="view-mode">{viewMode}</output>
        </IntegrationHeaderContext.Provider>
      );
    };

    const renderWithIntegration = (current = 'my-flow.camel.yaml', history?: RouteVisualizationUndoRedo) =>
      render(
        <MemoryRouter>
          <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
            <EditorHistoryContext.Provider value={{ history, setHistory: () => {} }}>
              <ViewModeProvider current={current}>
                <ProjectToolbar />
              </ViewModeProvider>
            </EditorHistoryContext.Provider>
          </RuntimeProvider>
        </MemoryRouter>,
      );

    it('does not render the view mode switcher without an active integration', () => {
      renderComponent();
      expect(screen.queryByTestId('integration-shell-switcher')).not.toBeInTheDocument();
    });

    it('switches a route file between design and code', async () => {
      const user = userEvent.setup();
      renderWithIntegration();
      expect(screen.getByTestId('view-mode')).toHaveTextContent('design');

      await user.click(screen.getByTestId('view-mode-code'));

      expect(screen.getByTestId('view-mode')).toHaveTextContent('code');
    });

    it('disables the topology view for now', () => {
      renderWithIntegration();

      expect(screen.getByTestId('view-mode-topology')).toBeDisabled();
    });

    it('shows no view mode switcher for a file that only has a text editor', () => {
      renderWithIntegration('schemas/order.json');

      expect(screen.queryByTestId('integration-shell-switcher')).not.toBeInTheDocument();
    });

    it('undoes in the editor from the toolbar while the editor can undo', async () => {
      const user = userEvent.setup();
      const history = { undo: vi.fn(), redo: vi.fn(), canUndo: true, canRedo: false };
      renderWithIntegration('my-flow.camel.yaml', history);

      await user.click(screen.getByRole('button', { name: /undo/i }));

      expect(history.undo).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled();
    });
  });
});
