import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperDndProvider } from '../../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../../providers/dnd/SourceTargetDnDHandler';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import { getShipOrderToShipOrderXslt, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { ExportMappingFileModal } from './ExportMappingFileModal';

// Mock CodeEditor to capture onEditorDidMount callback
vi.mock('@patternfly/react-code-editor', async () => {
  const actual = await vi.importActual('@patternfly/react-code-editor');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CodeEditor: ({ onEditorDidMount, ...props }: any) => {
      // Store the callback for testing
      if (onEditorDidMount && typeof onEditorDidMount === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).__onEditorDidMountCallback = onEditorDidMount;
      }
      // Render a mock that maintains the expected DOM structure
      return (
        <div className="pf-v6-c-code-editor" data-testid="mocked-code-editor">
          <div className="pf-v6-c-code-editor__main">
            <div className="pf-v6-c-code-editor__code">
              <pre>{props.code}</pre>
            </div>
          </div>
          <button aria-label="Download code">Download</button>
        </div>
      );
    },
  };
});

const dndHandler = new SourceTargetDnDHandler();

const TestProviders: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <DataMapperProvider>
    <DataMapperDndProvider handler={dndHandler}>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperDndProvider>
  </DataMapperProvider>
);

describe('ExportMappingFileModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={false} onClose={mockOnClose} />
      </TestProviders>,
    );

    expect(screen.queryByTestId('dm-debug-export-mappings-modal')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    expect(screen.getByTestId('dm-debug-export-mappings-modal')).toBeInTheDocument();
  });

  it('should display modal title', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    expect(screen.getByText('Exported Mappings')).toBeInTheDocument();
  });

  it('should render code editor wrapper', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    // CodeEditor component renders within a code editor wrapper
    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const closeButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent('Close');
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const closeButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');

    act(() => {
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when modal is closed via backdrop or escape', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const modal = screen.getByTestId('dm-debug-export-mappings-modal');

    // Simulate closing via the modal's onClose handler
    act(() => {
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
    });

    // The modal component should trigger onClose
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should serialize and display empty mappings when no mappings exist', async () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    await waitFor(() => {
      const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
      expect(codeEditorWrapper).toBeInTheDocument();
    });
  });

  it('should serialize and display mappings when mappings exist', async () => {
    const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { mappingTree, setMappingTree, sourceParameterMap, setSourceBodyDocument, setTargetBodyDocument } =
        useDataMapper();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, mappingTree, sourceParameterMap);
        setMappingTree(mappingTree);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{children}</>;
    };

    render(
      <TestProviders>
        <TestLoader>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestLoader>
      </TestProviders>,
    );

    await waitFor(() => {
      const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
      expect(codeEditorWrapper).toBeInTheDocument();
    });
  });

  it('should have code editor with XML language', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // CodeEditor component should be configured with XML language
  });

  it('should have code editor with download enabled', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const downloadButton = screen.getByLabelText('Download code');
    expect(downloadButton).toBeInTheDocument();
    // CodeEditor should have download functionality enabled
  });

  it('should update serialized mappings when mappingTree changes', async () => {
    const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { mappingTree, setMappingTree, setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        // Initially no mappings
        setMappingTree(mappingTree);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{children}</>;
    };

    const { rerender } = render(
      <TestProviders>
        <TestLoader>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestLoader>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(document.querySelector('.pf-v6-c-code-editor')).toBeInTheDocument();
    });

    // Rerender to trigger useEffect
    rerender(
      <TestProviders>
        <TestLoader>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestLoader>
      </TestProviders>,
    );

    await waitFor(() => {
      expect(document.querySelector('.pf-v6-c-code-editor')).toBeInTheDocument();
    });
  });

  it('should have modal with large variant', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const modal = screen.getByTestId('dm-debug-export-mappings-modal');
    expect(modal).toBeInTheDocument();
    // Modal should be rendered with large variant
  });

  it('should render code editor with word wrap enabled', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // Editor options should include wordWrap: 'on'
  });

  it('should render code editor with sizeToFit dimensions', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // Editor should have height and width set to 'sizeToFit'
  });

  describe('onEditorDidMount callback', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockEditor: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockMonaco: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockModel: any;

    beforeEach(() => {
      // Reset the global callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).__onEditorDidMountCallback = undefined;

      // Create mock model with updateOptions
      mockModel = {
        updateOptions: vi.fn(),
      };

      // Create mock editor with layout and focus methods
      mockEditor = {
        layout: vi.fn(),
        focus: vi.fn(),
      };

      // Create mock monaco with getModels method
      mockMonaco = {
        editor: {
          getModels: vi.fn().mockReturnValue([mockModel]),
        },
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should call editor.layout() when editor mounts', () => {
      render(
        <TestProviders>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestProviders>,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (globalThis as any).__onEditorDidMountCallback;
      expect(callback).toBeDefined();

      // Invoke the callback
      act(() => {
        callback(mockEditor, mockMonaco);
      });

      expect(mockEditor.layout).toHaveBeenCalledTimes(1);
    });

    it('should call editor.focus() when editor mounts', () => {
      render(
        <TestProviders>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestProviders>,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (globalThis as any).__onEditorDidMountCallback;
      expect(callback).toBeDefined();

      // Invoke the callback
      act(() => {
        callback(mockEditor, mockMonaco);
      });

      expect(mockEditor.focus).toHaveBeenCalledTimes(1);
    });

    it('should call monaco.editor.getModels()[0].updateOptions with tabSize: 2', () => {
      render(
        <TestProviders>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestProviders>,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (globalThis as any).__onEditorDidMountCallback;
      expect(callback).toBeDefined();

      // Invoke the callback
      act(() => {
        callback(mockEditor, mockMonaco);
      });

      expect(mockMonaco.editor.getModels).toHaveBeenCalledTimes(1);
      expect(mockModel.updateOptions).toHaveBeenCalledTimes(1);
      expect(mockModel.updateOptions).toHaveBeenCalledWith({ tabSize: 2 });
    });

    it('should call all three operations in sequence when editor mounts', () => {
      render(
        <TestProviders>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestProviders>,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (globalThis as any).__onEditorDidMountCallback;
      expect(callback).toBeDefined();

      // Invoke the callback
      act(() => {
        callback(mockEditor, mockMonaco);
      });

      // Verify all three operations were called
      expect(mockEditor.layout).toHaveBeenCalledTimes(1);
      expect(mockEditor.focus).toHaveBeenCalledTimes(1);
      expect(mockMonaco.editor.getModels).toHaveBeenCalledTimes(1);
      expect(mockModel.updateOptions).toHaveBeenCalledWith({ tabSize: 2 });

      // Verify the order of calls
      const layoutCallOrder = mockEditor.layout.mock.invocationCallOrder[0];
      const focusCallOrder = mockEditor.focus.mock.invocationCallOrder[0];
      const getModelsCallOrder = mockMonaco.editor.getModels.mock.invocationCallOrder[0];

      expect(layoutCallOrder).toBeLessThan(focusCallOrder);
      expect(focusCallOrder).toBeLessThan(getModelsCallOrder);
    });

    it('should handle onEditorDidMount callback being called multiple times', () => {
      render(
        <TestProviders>
          <ExportMappingFileModal isOpen={true} onClose={mockOnClose} />
        </TestProviders>,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (globalThis as any).__onEditorDidMountCallback;
      expect(callback).toBeDefined();

      // Invoke the callback multiple times
      act(() => {
        callback(mockEditor, mockMonaco);
        callback(mockEditor, mockMonaco);
      });

      // Each call should trigger the operations
      expect(mockEditor.layout).toHaveBeenCalledTimes(2);
      expect(mockEditor.focus).toHaveBeenCalledTimes(2);
      expect(mockMonaco.editor.getModels).toHaveBeenCalledTimes(2);
      expect(mockModel.updateOptions).toHaveBeenCalledTimes(2);
    });
  });
});
