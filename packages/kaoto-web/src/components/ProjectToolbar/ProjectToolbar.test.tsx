import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

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
    const ViewModeProvider = ({ current, children }: { current: string; children: React.ReactNode }) => {
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
        [current, viewMode],
      );
      return (
        <IntegrationHeaderContext.Provider value={value}>
          {children}
          <output data-testid="view-mode">{viewMode}</output>
        </IntegrationHeaderContext.Provider>
      );
    };

    /** `current` is the name of the open file */
    const renderWithIntegration = (current = 'my-flow.camel.yaml') =>
      render(
        <MemoryRouter>
          <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
            <ViewModeProvider current={current}>
              <ProjectToolbar />
            </ViewModeProvider>
          </RuntimeProvider>
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

    it.each(['main-flow.camel.yaml', 'legacy-route.camel.xml', 'order-test.citrus.yaml'])(
      'enables the views for the route file %s',
      (current) => {
        renderWithIntegration(current);

        for (const testId of ['view-mode-design', 'view-mode-code', 'view-mode-topology']) {
          expect(screen.getByTestId(testId)).toBeEnabled();
        }
        expect(screen.getByTestId('view-mode-design')).toHaveAttribute('aria-selected', 'true');
      },
    );

    it.each(['schema.xsd', 'order-template.json', 'notes.txt', 'pom.xml'])(
      'disables the views for %s and marks Code, as it opens as text',
      async (current) => {
        const user = userEvent.setup();
        renderWithIntegration(current);

        for (const testId of ['view-mode-design', 'view-mode-code', 'view-mode-topology']) {
          expect(screen.getByTestId(testId)).toBeDisabled();
        }
        expect(screen.getByTestId('view-mode-code')).toHaveAttribute('aria-selected', 'true');

        await user.click(screen.getByTestId('view-mode-topology'));
        expect(screen.getByTestId('view-mode')).toHaveTextContent('design');
      },
    );
  });
});
