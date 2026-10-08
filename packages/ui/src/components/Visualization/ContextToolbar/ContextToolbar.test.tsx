import { VisualizationProvider } from '@patternfly/react-topology';
import { render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';

import {
  CamelRouteResource,
  IntegrationResource,
  KameletBindingResource,
  KameletResource,
  PipeResource,
} from '../../../models/camel';
import { useSourceCodeStore } from '../../../store';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../stubs';
import { ControllerService } from '../Canvas/controller.service';
import { ContextToolbar } from './ContextToolbar';

/** Data-testids rendered by the real toolbar children */
const TOOLBAR_ITEMS = {
  'flows-menu': 'flows-list-dropdown',
  'new-entity': 'new-entity-list-dropdown',
  'flow-clipboard': 'clipboardButton',
  'flow-export-image': 'exportImageButton',
  'export-document': 'documentationPreviewButton',
  'selected-runtime': 'runtime-selector-display',
  'integration-type-selector': 'integration-type-list-dropdown',
} as const;

/** Renders the toolbar with the providers its real children need */
const renderToolbar = async (
  ui: React.ReactElement,
  props: Parameters<typeof TestProvidersWrapper>[0] = {},
): Promise<void> => {
  const { Provider } = await TestProvidersWrapper(props);
  const { Provider: RuntimeProvider } = TestRuntimeProviderWrapper();
  const controller = ControllerService.createController();
  const wrapper = ({ children }: PropsWithChildren) => (
    <MemoryRouter>
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={controller}>{children}</VisualizationProvider>
        </Provider>
      </RuntimeProvider>
    </MemoryRouter>
  );

  render(ui, { wrapper });
};

describe('ContextToolbar', () => {
  beforeEach(() => {
    /* A single source code change: there is something to undo, but nothing to redo */
    useSourceCodeStore.setState(useSourceCodeStore.getInitialState(), true);
    useSourceCodeStore.temporal.getState().clear();
    useSourceCodeStore.getState().setSourceCode('- route:\n    id: route-1234');
  });

  describe('when using multipleRoute configuration', () => {
    it('should include NewEntity component for Route schema type', async () => {
      const camelResource = new CamelRouteResource([]);
      await renderToolbar(<ContextToolbar />, { camelResource });

      expect(screen.getByTestId(TOOLBAR_ITEMS['new-entity'])).toBeInTheDocument();
    });

    it('should include NewEntity component for Integration schema type', async () => {
      const camelResource = new IntegrationResource();
      await renderToolbar(<ContextToolbar />, { camelResource });

      expect(screen.getByTestId(TOOLBAR_ITEMS['new-entity'])).toBeInTheDocument();
    });
  });

  describe('when using single route configuration', () => {
    it('should not include NewEntity component for Kamelet schema type', async () => {
      const camelResource = new KameletResource();
      await renderToolbar(<ContextToolbar />, { camelResource });

      expect(screen.queryByTestId(TOOLBAR_ITEMS['new-entity'])).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for Pipe schema type', async () => {
      const camelResource = new PipeResource();
      await renderToolbar(<ContextToolbar />, { camelResource });

      expect(screen.queryByTestId(TOOLBAR_ITEMS['new-entity'])).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for KameletBinding schema type', async () => {
      const camelResource = new KameletBindingResource();
      await renderToolbar(<ContextToolbar />, { camelResource });

      expect(screen.queryByTestId(TOOLBAR_ITEMS['new-entity'])).not.toBeInTheDocument();
    });
  });

  describe('undo/redo buttons', () => {
    it('should render undo button', async () => {
      await renderToolbar(<ContextToolbar />);

      const undoButton = screen.getByLabelText('Undo');
      expect(undoButton).toBeInTheDocument();
      expect(undoButton).toHaveAttribute('title', expect.stringContaining('Undo'));
      expect(undoButton).not.toBeDisabled();
    });

    it('should render redo button', async () => {
      await renderToolbar(<ContextToolbar />);

      const redoButton = screen.getByLabelText('Redo');
      expect(redoButton).toBeInTheDocument();
      expect(redoButton).toHaveAttribute('title', expect.stringContaining('Redo'));
      expect(redoButton).toBeDisabled(); // nothing has been undone yet
    });
  });

  describe('other toolbar buttons', () => {
    it.each([
      ['flows-menu', 'FlowsMenu'],
      ['flow-clipboard', 'FlowClipboard'],
      ['flow-export-image', 'FlowExportImage'],
      ['export-document', 'ExportDocument'],
      ['selected-runtime', 'SelectedRuntime'],
      ['integration-type-selector', 'IntegrationTypeSelector'],
    ])('should render %s component', async (item) => {
      await renderToolbar(<ContextToolbar />);

      expect(screen.getByTestId(TOOLBAR_ITEMS[item as keyof typeof TOOLBAR_ITEMS])).toBeInTheDocument();
    });
  });

  describe('when isSimplified is true', () => {
    it('should not render IntegrationTypeSelector', async () => {
      await renderToolbar(<ContextToolbar isSimplified />);

      expect(screen.queryByTestId(TOOLBAR_ITEMS['integration-type-selector'])).not.toBeInTheDocument();
    });

    it('should not render SelectedRuntime', async () => {
      await renderToolbar(<ContextToolbar isSimplified />);

      expect(screen.queryByTestId(TOOLBAR_ITEMS['selected-runtime'])).not.toBeInTheDocument();
    });

    it('should still render the core toolbar items', async () => {
      await renderToolbar(<ContextToolbar isSimplified />);

      expect(screen.getByTestId(TOOLBAR_ITEMS['flows-menu'])).toBeInTheDocument();
      expect(screen.getByTestId(TOOLBAR_ITEMS['new-entity'])).toBeInTheDocument();
      expect(screen.getByTestId(TOOLBAR_ITEMS['flow-clipboard'])).toBeInTheDocument();
      expect(screen.getByTestId(TOOLBAR_ITEMS['flow-export-image'])).toBeInTheDocument();
      expect(screen.getByTestId(TOOLBAR_ITEMS['export-document'])).toBeInTheDocument();
      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
    });
  });
});
