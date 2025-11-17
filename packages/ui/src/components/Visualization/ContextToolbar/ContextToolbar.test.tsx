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
jest.mock('../../../hooks/undo-redo.hook', () => ({
  useUndoRedo: () => ({
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: true,
    canRedo: false,
  }),
}));

// Mock all the child components to avoid complex dependencies
jest.mock('./Flows/FlowsMenu', () => ({
  FlowsMenu: () => <div data-testid="flows-menu">FlowsMenu</div>,
}));

jest.mock('./NewEntity/NewEntity', () => ({
  NewEntity: () => <div data-testid="new-entity">NewEntity</div>,
}));

jest.mock('./FlowClipboard/FlowClipboard', () => ({
  FlowClipboard: () => <div data-testid="flow-clipboard">FlowClipboard</div>,
}));

jest.mock('./FlowExportImage/FlowExportImage', () => ({
  FlowExportImage: () => <div data-testid="flow-export-image">FlowExportImage</div>,
}));

jest.mock('./ExportDocument/ExportDocument', () => ({
  ExportDocument: () => <div data-testid="export-document">ExportDocument</div>,
}));

jest.mock('./RuntimeSelector/RuntimeSelector', () => ({
  RuntimeSelector: () => <div data-testid="runtime-selector">RuntimeSelector</div>,
}));

describe('ContextToolbar', () => {
  describe('when using multipleRoute configuration', () => {
    it('should include NewEntity component for Route schema type', () => {
      const camelResource = new CamelRouteResource([]);
      const { Provider } = TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('new-entity')).toBeInTheDocument();
    });

    it('should include NewEntity component for Integration schema type', () => {
      const camelResource = new IntegrationResource();
      const { Provider } = TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('new-entity')).toBeInTheDocument();
    });
  });

  describe('when using single route configuration', () => {
    it('should not include NewEntity component for Kamelet schema type', () => {
      const camelResource = new KameletResource();
      const { Provider } = TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for Pipe schema type', () => {
      const camelResource = new PipeResource();
      const { Provider } = TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });

    it('should not include NewEntity component for KameletBinding schema type', () => {
      const camelResource = new KameletBindingResource();
      const { Provider } = TestProvidersWrapper({ camelResource });

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.queryByTestId('new-entity')).not.toBeInTheDocument();
    });
  });

  describe('undo/redo buttons', () => {
    it('should render undo button', () => {
      const { Provider } = TestProvidersWrapper();

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

    it('should render redo button', () => {
      const { Provider } = TestProvidersWrapper();

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
    it('should render FlowsMenu component', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flows-menu')).toBeInTheDocument();
    });

    it('should render FlowClipboard component', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flow-clipboard')).toBeInTheDocument();
    });

    it('should render FlowExportImage component', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('flow-export-image')).toBeInTheDocument();
    });

    it('should render ExportDocument component', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('export-document')).toBeInTheDocument();
    });

    it('should render RuntimeSelector component', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      expect(screen.getByTestId('runtime-selector')).toBeInTheDocument();
    });
  });

  describe('additional controls', () => {
    it('should render additional controls when provided', () => {
      const { Provider } = TestProvidersWrapper();
      const additionalControls = [
        <div key="test-control" data-testid="additional-control">
          Test Control
        </div>,
      ];

      render(
        <Provider>
          <ContextToolbar additionalControls={additionalControls} />
        </Provider>,
      );

      expect(screen.getByTestId('additional-control')).toBeInTheDocument();
    });

    it('should work without additional controls', () => {
      const { Provider } = TestProvidersWrapper();

      render(
        <Provider>
          <ContextToolbar />
        </Provider>,
      );

      // Should render basic components without additional controls
      expect(screen.getByTestId('flows-menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
    });
  });
});
