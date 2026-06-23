import { render, screen } from '@testing-library/react';

import {
  CamelRouteResource,
  IntegrationResource,
  KameletBindingResource,
  KameletResource,
  PipeResource,
} from '../../../models/camel';
import { TestProvidersWrapper } from '../../../stubs';
import { ContextToolbar } from './ContextToolbar';

// Mock the useUndoRedo hook
vi.mock('../../../hooks/undo-redo.hook', () => ({
  useUndoRedo: () => ({
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: true,
    canRedo: false,
  }),
}));

// Mock all the child components to avoid complex dependencies
vi.mock('./Flows/FlowsMenu', () => ({
  FlowsMenu: () => <div data-testid="flows-menu">FlowsMenu</div>,
}));

vi.mock('./NewEntity/NewEntity', () => ({
  NewEntity: () => <div data-testid="new-entity">NewEntity</div>,
}));

vi.mock('./FlowClipboard/FlowClipboard', () => ({
  FlowClipboard: () => <div data-testid="flow-clipboard">FlowClipboard</div>,
}));

vi.mock('./FlowExportImage/FlowExportImage', () => ({
  FlowExportImage: () => <div data-testid="flow-export-image">FlowExportImage</div>,
}));

vi.mock('./ExportDocument/ExportDocument', () => ({
  ExportDocument: () => <div data-testid="export-document">ExportDocument</div>,
}));

vi.mock('./SelectedRuntime/SelectedRuntime', () => ({
  SelectedRuntime: () => <div data-testid="selected-runtime">SelectedRuntime</div>,
}));

vi.mock('./IntegrationTypeSelector/IntegrationTypeSelector', () => ({
  IntegrationTypeSelector: () => <div data-testid="integration-type-selector">IntegrationTypeSelector</div>,
}));

describe('ContextToolbar', () => {
  describe('when using multipleRoute configuration', () => {
    it('should include NewEntity component for Route schema type', async () => {
      const camelResource = new CamelRouteResource([]);
      const { Provider } = await TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('new-entity')).toBeInTheDocument();
    });

    it('should include NewEntity component for Integration schema type', async () => {
      const camelResource = new IntegrationResource();
      const { Provider } = await TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('new-entity')).toBeInTheDocument();
    });
  });

  describe('when using single route configuration', () => {
    it('should not include NewEntity component for Kamelet schema type', async () => {
      const camelResource = new KameletResource();
      const { Provider } = await TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for Pipe schema type', async () => {
      const camelResource = new PipeResource();
      const { Provider } = await TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for KameletBinding schema type', async () => {
      const camelResource = new KameletBindingResource();
      const { Provider } = await TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });
  });

  describe('undo/redo buttons', () => {
    it('should render undo button', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      const undoButton = screen.getByLabelText('Undo');
      expect(undoButton).toBeInTheDocument();
      expect(undoButton).toHaveAttribute('title', expect.stringContaining('Undo'));
      expect(undoButton).not.toBeDisabled();
    });

    it('should render redo button', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      const redoButton = screen.getByLabelText('Redo');
      expect(redoButton).toBeInTheDocument();
      expect(redoButton).toHaveAttribute('title', expect.stringContaining('Redo'));
      expect(redoButton).toBeDisabled(); // canRedo is false in our mock
    });
  });

  describe('other toolbar buttons', () => {
    it('should render FlowsMenu component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flows-menu')).toBeInTheDocument();
    });

    it('should render FlowClipboard component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flow-clipboard')).toBeInTheDocument();
    });

    it('should render FlowExportImage component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flow-export-image')).toBeInTheDocument();
    });

    it('should render ExportDocument component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('export-document')).toBeInTheDocument();
    });

    it('should render SelectedRuntime component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('selected-runtime')).toBeInTheDocument();
    });

    it('should render IntegrationTypeSelector component', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('integration-type-selector')).toBeInTheDocument();
    });
  });

  describe('when isSimplified is true', () => {
    it('should not render IntegrationTypeSelector', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar isSimplified />
        </Provider>,
      );

      expect(screen.queryByTestId('integration-type-selector')).not.toBeInTheDocument();
    });

    it('should not render SelectedRuntime', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar isSimplified />
        </Provider>,
      );

      expect(screen.queryByTestId('selected-runtime')).not.toBeInTheDocument();
    });

    it('should still render the core toolbar items', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar isSimplified />
        </Provider>,
      );

      expect(screen.getByTestId('flows-menu')).toBeInTheDocument();
      expect(screen.getByTestId('new-entity')).toBeInTheDocument();
      expect(screen.getByTestId('flow-clipboard')).toBeInTheDocument();
      expect(screen.getByTestId('flow-export-image')).toBeInTheDocument();
      expect(screen.getByTestId('export-document')).toBeInTheDocument();
      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
    });
  });
});
