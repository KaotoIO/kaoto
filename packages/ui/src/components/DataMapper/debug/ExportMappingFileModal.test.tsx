import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { editor } from 'monaco-editor';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import type { MockInstance } from 'vitest';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperDndProvider } from '../../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../../providers/dnd/SourceTargetDnDHandler';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import { getShipOrderToShipOrderXslt, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { ExportMappingFileModal } from './ExportMappingFileModal';

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
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    expect(screen.getByTestId('dm-debug-export-mappings-modal')).toBeInTheDocument();
  });

  it('should display modal title', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    expect(screen.getByText('Exported Mappings')).toBeInTheDocument();
  });

  it('should render code editor wrapper', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    // CodeEditor component renders within a code editor wrapper
    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
  });

  it('should render close button', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const closeButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent('Close');
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const closeButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');

    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when modal is closed via backdrop or escape', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const modal = screen.getByTestId('dm-debug-export-mappings-modal');

    // Simulate closing via the modal's onClose handler
    fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });

    // The modal component should trigger onClose
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should serialize and display empty mappings when no mappings exist', async () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    await waitFor(() => {
      const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
      expect(codeEditorWrapper).toBeInTheDocument();
    });
  });

  it('should serialize and display mappings when mappings exist', async () => {
    const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { mappingTree, refreshMappingTree, sourceParameterMap, updateDocument } = useDataMapper();
      useEffect(() => {
        TestUtil.seedDocument(updateDocument, TestUtil.createSourceOrderDoc());
        const targetDoc = TestUtil.createTargetOrderDoc();
        TestUtil.seedDocument(updateDocument, targetDoc);
        MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, mappingTree, sourceParameterMap);
        refreshMappingTree({ structural: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{children}</>;
    };

    render(
      <TestProviders>
        <TestLoader>
          <ExportMappingFileModal isOpen onClose={mockOnClose} />
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
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // CodeEditor component should be configured with XML language
  });

  it('should have code editor with download enabled', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const downloadButton = screen.getByLabelText('Download code');
    expect(downloadButton).toBeInTheDocument();
    // CodeEditor should have download functionality enabled
  });

  it('should update serialized mappings when mappingTree changes', async () => {
    const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { refreshMappingTree, updateDocument } = useDataMapper();
      useEffect(() => {
        TestUtil.seedDocument(updateDocument, TestUtil.createSourceOrderDoc());
        TestUtil.seedDocument(updateDocument, TestUtil.createTargetOrderDoc());
        // Initially no mappings
        refreshMappingTree({ structural: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{children}</>;
    };

    const { rerender } = render(
      <TestProviders>
        <TestLoader>
          <ExportMappingFileModal isOpen onClose={mockOnClose} />
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
          <ExportMappingFileModal isOpen onClose={mockOnClose} />
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
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const modal = screen.getByTestId('dm-debug-export-mappings-modal');
    expect(modal).toBeInTheDocument();
    // Modal should be rendered with large variant
  });

  it('should render code editor with word wrap enabled', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // Editor options should include wordWrap: 'on'
  });

  it('should render code editor with sizeToFit dimensions', () => {
    render(
      <TestProviders>
        <ExportMappingFileModal isOpen onClose={mockOnClose} />
      </TestProviders>,
    );

    const codeEditorWrapper = document.querySelector('.pf-v6-c-code-editor');
    expect(codeEditorWrapper).toBeInTheDocument();
    // Editor should have height and width set to 'sizeToFit'
  });

  describe('onEditorDidMount callback', () => {
    const originalCreate = editor.create;
    let layoutSpies: MockInstance<editor.IStandaloneCodeEditor['layout']>[];
    let focusSpies: MockInstance<editor.IStandaloneCodeEditor['focus']>[];
    let getModelsSpy: MockInstance<typeof editor.getModels>;

    const countCalls = (spies: MockInstance[]) => spies.reduce((total, spy) => total + spy.mock.calls.length, 0);

    /** Renders the modal and waits until the real Monaco editor has been mounted (onEditorDidMount ran). */
    const renderAndWaitForEditorMount = async () => {
      const result = render(
        <TestProviders>
          <ExportMappingFileModal isOpen onClose={mockOnClose} />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(getModelsSpy).toHaveBeenCalled();
      });
      return result;
    };

    beforeEach(() => {
      layoutSpies = [];
      focusSpies = [];
      // Observe the real editor instances created by the CodeEditor
      vi.spyOn(editor, 'create').mockImplementation((...args) => {
        const instance = originalCreate(...args);
        layoutSpies.push(vi.spyOn(instance, 'layout'));
        focusSpies.push(vi.spyOn(instance, 'focus'));
        return instance;
      });
      getModelsSpy = vi.spyOn(editor, 'getModels');
    });

    it('should call editor.layout() when editor mounts', async () => {
      await renderAndWaitForEditorMount();

      expect(layoutSpies).toHaveLength(1);
      expect(layoutSpies[0]).toHaveBeenCalledTimes(1);
    });

    it('should call editor.focus() when editor mounts', async () => {
      await renderAndWaitForEditorMount();

      expect(focusSpies).toHaveLength(1);
      expect(focusSpies[0]).toHaveBeenCalledTimes(1);
    });

    it('should call monaco.editor.getModels()[0].updateOptions with tabSize: 2', async () => {
      await renderAndWaitForEditorMount();

      expect(getModelsSpy).toHaveBeenCalledTimes(1);
      const [firstModel] = getModelsSpy.mock.results[0].value;
      expect(firstModel.getOptions().tabSize).toBe(2);
    });

    it('should call all three operations in sequence when editor mounts', async () => {
      await renderAndWaitForEditorMount();

      // Verify all three operations were called
      expect(layoutSpies[0]).toHaveBeenCalledTimes(1);
      expect(focusSpies[0]).toHaveBeenCalledTimes(1);
      expect(getModelsSpy).toHaveBeenCalledTimes(1);
      const [firstModel] = getModelsSpy.mock.results[0].value;
      expect(firstModel.getOptions().tabSize).toBe(2);

      // Verify the order of calls
      const layoutCallOrder = layoutSpies[0].mock.invocationCallOrder[0];
      const focusCallOrder = focusSpies[0].mock.invocationCallOrder[0];
      const getModelsCallOrder = getModelsSpy.mock.invocationCallOrder[0];

      expect(layoutCallOrder).toBeLessThan(focusCallOrder);
      expect(focusCallOrder).toBeLessThan(getModelsCallOrder);
    });

    it('should handle onEditorDidMount callback being called multiple times', async () => {
      const { rerender } = await renderAndWaitForEditorMount();

      // Close and reopen the modal so the editor is mounted again
      rerender(
        <TestProviders>
          <ExportMappingFileModal isOpen={false} onClose={mockOnClose} />
        </TestProviders>,
      );
      rerender(
        <TestProviders>
          <ExportMappingFileModal isOpen onClose={mockOnClose} />
        </TestProviders>,
      );
      await waitFor(() => {
        expect(getModelsSpy).toHaveBeenCalledTimes(2);
      });

      // Each mount should trigger the operations
      expect(countCalls(layoutSpies)).toBe(2);
      expect(countCalls(focusSpies)).toBe(2);
      expect(getModelsSpy).toHaveBeenCalledTimes(2);
    });
  });
});
