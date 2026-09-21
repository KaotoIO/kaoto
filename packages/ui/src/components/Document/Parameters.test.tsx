import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { PARAMETERS_SECTION_ANCHOR } from '../../models/datamapper/connection-port';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';
import { getShipOrderJsonSchema, getShipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { createFile } from '../../stubs/read-file-as-string';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import { ParametersSection } from './Parameters';

describe('ParametersSection', () => {
  // Helper to wrap components with VirtuosoMockContext for testing
  const renderWithVirtuoso = (component: React.ReactElement) => {
    return render(component, {
      wrapper: ({ children }) => (
        <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 40 }}>
          {children}
        </VirtuosoMockContext.Provider>
      ),
    });
  };

  it('should add, rename, and remove a parameter', async () => {
    const mockUpdateDocument = vi.fn();
    const mockDeleteParameter = vi.fn();
    const mockRenameParameter = vi.fn();
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider
          onUpdateDocument={mockUpdateDocument}
          onDeleteParameter={mockDeleteParameter}
          onRenameParameter={mockRenameParameter}
        >
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    expect(mockUpdateDocument.mock.calls).toHaveLength(0);
    expect(mockDeleteParameter.mock.calls).toHaveLength(0);
    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton);
    expect(mockUpdateDocument.mock.calls).toHaveLength(1);
    expect(mockDeleteParameter.mock.calls).toHaveLength(0);
    expect(mockUpdateDocument.mock.calls[0][0]['name']).toBe('testparam1');

    const renameButton = screen.getByTestId('rename-parameter-testparam1-button');
    fireEvent.click(renameButton);
    fireEvent.change(screen.getByTestId('new-parameter-name-input'), { target: { value: 'testparam2' } });
    fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));
    expect(mockRenameParameter).toHaveBeenCalledTimes(1);

    const deleteButton = screen.getByTestId('delete-parameter-testparam2-button');
    fireEvent.click(deleteButton);
    const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
    fireEvent.click(confirmButton);
    expect(mockUpdateDocument.mock.calls).toHaveLength(1);
    expect(mockDeleteParameter.mock.calls).toHaveLength(1);
    expect(mockDeleteParameter.mock.calls[0][0]).toBe('testparam2');
    await screen.findByTestId('add-parameter-button');
    const notexist = screen.queryByTestId('delete-parameter-testparam2-button');
    expect(notexist).toBeFalsy();
  });

  it('should show validation error for invalid parameter name', async () => {
    const mockUpdateDocument = vi.fn();
    const mockDeleteParameter = vi.fn();
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    expect(mockUpdateDocument.mock.calls).toHaveLength(0);
    expect(mockDeleteParameter.mock.calls).toHaveLength(0);
    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);
    let paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1::' } });
    const invalidError = screen.getByTestId('new-parameter-name-input-error');
    expect(invalidError).toBeInTheDocument();
    expect(invalidError).toHaveTextContent("Invalid parameter name 'testparam1::': it must be a valid QName");
    let submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    expect(submitButton.disabled).toBeFalsy();
    fireEvent.click(submitButton);
    fireEvent.click(addButton);
    paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    const duplicateError = screen.getByTestId('new-parameter-name-input-error');
    expect(duplicateError).toBeInTheDocument();
    expect(duplicateError).toHaveTextContent("Parameter 'testparam1' already exists");
    submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();
  });

  it('should attach and detach a schema', async () => {
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton);

    const attachButton = screen.getByTestId('attach-schema-param-testparam1-button');
    fireEvent.click(attachButton);
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    fireEvent.click(importButton);

    const fileContent = createFile(getShipOrderXsd(), 'ShipOrder.xsd');
    const fileInput = screen.getByTestId('attach-schema-file-input');
    fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });

    await waitFor(() => {
      screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
      const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlSchemaRadio.checked).toBeTruthy();
      const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
      expect(jsonSchemaRadio.checked).toBeFalsy();
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    fireEvent.click(commitButton);

    const shipTo = await screen.findByTestId(/node-source-fx-ShipTo.*/);
    expect(shipTo).toBeTruthy();

    const detachButton = screen.getByTestId('detach-schema-param-testparam1-button');
    fireEvent.click(detachButton);
    const detachConfirmButton = screen.getByTestId('detach-schema-modal-confirm-btn');
    fireEvent.click(detachConfirmButton);
    await screen.findByTestId('add-parameter-button');
    expect(screen.queryByTestId('ShipTo')).toBeFalsy();
  });

  it('should attach JSON schema', async () => {
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton);

    const attachButton = screen.getByTestId('attach-schema-param-testparam1-button');
    fireEvent.click(attachButton);
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    fireEvent.click(importButton);

    const fileContent = createFile(getShipOrderJsonSchema(), 'ShipOrder.json');
    const fileInput = screen.getByTestId('attach-schema-file-input');
    fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });

    await waitFor(() => {
      screen.getByTestId('attach-schema-file-item-ShipOrder.json');
      const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
      expect(jsonSchemaRadio.checked).toBeTruthy();
      const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlSchemaRadio.checked).toBeFalsy();
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    fireEvent.click(commitButton);

    const shipTo = await screen.findByText('map [@key = ShipTo]');
    expect(shipTo).toBeTruthy();
  });

  it('should be read-only when isReadOnly is true', async () => {
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = screen.queryByTestId('add-parameter-button');
    expect(addButton).not.toBeInTheDocument();
  });

  it('should cancel adding new parameter', async () => {
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });

    const cancelButton = screen.getByTestId('new-parameter-cancel-btn');
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId('new-parameter-name-input')).not.toBeInTheDocument();
  });

  // Note: Test removed - expansion behavior is now managed by ExpansionPanel component
  // and tested separately in ExpansionPanel.test.tsx

  it('should handle empty parameter name validation', async () => {
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);

    const submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    expect(paramNameInput).toHaveAttribute('placeholder', 'parameter name');
  });

  it('should handle parameter submission with duplicate parameter check', async () => {
    const mockUpdateDocument = vi.fn();
    renderWithVirtuoso(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
          <MappingLinksProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} />
            </ExpansionPanels>
          </MappingLinksProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    fireEvent.click(addButton);

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });

    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton);

    // Try to add the same parameter again - should be prevented but handled gracefully
    fireEvent.click(addButton);

    const paramNameInput2 = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput2, { target: { value: 'testparam1' } });

    const submitButton2 = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton2);

    // Should still call updateDocument only once since duplicate is handled
    expect(mockUpdateDocument).toHaveBeenCalledTimes(1);
  });

  describe('Show/Hide All Parameters Toggle', () => {
    it('should hide all parameters when toggle button is clicked', async () => {
      const mockUpdateDocument = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter first
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Verify parameter is visible
      await screen.findByTestId('delete-parameter-testparam1-button');

      // Click toggle to hide parameters
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      fireEvent.click(toggleButton);

      // Parameter should no longer be in the DOM
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-testparam1-button')).not.toBeInTheDocument();
      });
    });

    it('should show all parameters when toggle button is clicked again', async () => {
      const mockUpdateDocument = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      await screen.findByTestId('delete-parameter-testparam1-button');

      // Hide parameters
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-testparam1-button')).not.toBeInTheDocument();
      });

      // Show parameters again
      fireEvent.click(toggleButton);

      await screen.findByTestId('delete-parameter-testparam1-button');
    });

    it('should change toggle button icon and title when hiding/showing parameters', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const toggleButton = await screen.findByTestId('toggle-parameters-button');

      // Initially showing parameters - should have "Hide all parameters" title
      expect(toggleButton).toHaveAttribute('title', 'Hide all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all parameters');

      // Click to hide
      fireEvent.click(toggleButton);

      // Should now show "Show all parameters" title
      expect(toggleButton).toHaveAttribute('title', 'Show all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show all parameters');

      // Click to show again
      fireEvent.click(toggleButton);

      // Back to "Hide all parameters"
      expect(toggleButton).toHaveAttribute('title', 'Hide all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all parameters');
    });

    it('should render connection port on ParametersHeader', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const port = await screen.findByTestId('connection-port-parameters-header');
      expect(port).toBeInTheDocument();
      expect(port).toHaveAttribute('data-connection-port', 'true');
      expect(port).toHaveAttribute('data-node-path', 'param:_parameters_header://');
      expect(port).toHaveAttribute('data-document-node-id', PARAMETERS_SECTION_ANCHOR.documentNodeId);
    });

    it('should keep header connection port in DOM when parameters are hidden', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter so there is something to hide
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);
      fireEvent.change(screen.getByTestId('new-parameter-name-input'), { target: { value: 'p1' } });
      fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));
      await screen.findByTestId('document-doc-param-p1');

      // Hide all parameters
      fireEvent.click(screen.getByTestId('toggle-parameters-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('document-doc-param-p1')).not.toBeInTheDocument();
      });

      // Header port must still be in the DOM so syncConnectionPorts can measure it
      expect(screen.getByTestId('connection-port-parameters-header')).toBeInTheDocument();
    });

    it('should register the header port under the section anchor key on mount', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Header port exists in DOM from mount
      const port = await screen.findByTestId('connection-port-parameters-header');
      expect(port).toBeInTheDocument();
      expect(port).toHaveAttribute('data-connection-port', 'true');
      expect(port).toHaveAttribute('data-node-path', 'param:_parameters_header://');
      expect(port).toHaveAttribute('data-document-node-id', PARAMETERS_SECTION_ANCHOR.documentNodeId);

      // Asserted against the store rather than the screen: a port registered under the wrong
      // key renders identically, so only the store shows which bucket it landed in. jsdom
      // reports zero-size rects, so the coordinates themselves carry no information here.
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[PARAMETERS_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[PARAMETERS_SECTION_ANCHOR.nodePath]).toBeDefined();
        expect(Array.isArray(headerPorts[PARAMETERS_SECTION_ANCHOR.nodePath])).toBe(true);
      });
    });

    it('should keep header port in store after hide/show cycle', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);
      fireEvent.change(screen.getByTestId('new-parameter-name-input'), { target: { value: 'p1' } });
      fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));
      await screen.findByTestId('document-doc-param-p1');

      // Existence checks throughout: they show the anchor is never dropped from the store
      // across the cycle, not that a re-sync ran at each step.
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[PARAMETERS_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[PARAMETERS_SECTION_ANCHOR.nodePath]).toBeDefined();
      });

      // Hide parameters
      fireEvent.click(screen.getByTestId('toggle-parameters-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('document-doc-param-p1')).not.toBeInTheDocument();
      });

      // Anchor survives hiding all parameters
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[PARAMETERS_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[PARAMETERS_SECTION_ANCHOR.nodePath]).toBeDefined();
      });

      // Show parameters again
      fireEvent.click(screen.getByTestId('toggle-parameters-button'));
      await screen.findByTestId('document-doc-param-p1');

      // Anchor survives showing them again
      await waitFor(() => {
        const state = useDocumentTreeStore.getState();
        const headerPorts = state.nodesConnectionPorts[PARAMETERS_SECTION_ANCHOR.documentNodeId];
        expect(headerPorts).toBeDefined();
        expect(headerPorts[PARAMETERS_SECTION_ANCHOR.nodePath]).toBeDefined();
      });
    });
  });

  describe('Auto-Show Parameters', () => {
    it('should auto-show parameters when clicking add button while hidden', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Hide parameters first
      const toggleButton = await screen.findByTestId('toggle-parameters-button');
      fireEvent.click(toggleButton);

      // New parameter input should not be visible
      expect(screen.queryByTestId('new-parameter-name-input')).not.toBeInTheDocument();

      // Click add button
      const addButton = screen.getByTestId('add-parameter-button');
      fireEvent.click(addButton);

      // New parameter input should now be visible (auto-shown)
      expect(screen.getByTestId('new-parameter-name-input')).toBeInTheDocument();
    });
  });

  describe('Cancel Delete Parameter Modal', () => {
    it('should keep parameter when cancel button is clicked in delete modal', async () => {
      const mockUpdateDocument = vi.fn();
      const mockDeleteParameter = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Click delete button
      const deleteButton = await screen.findByTestId('delete-parameter-testparam1-button');
      fireEvent.click(deleteButton);

      // Modal should be visible
      expect(screen.getByTestId('delete-parameter-modal')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByTestId('delete-parameter-modal-cancel-btn');
      fireEvent.click(cancelButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-modal')).not.toBeInTheDocument();
      });

      // Parameter should still exist
      expect(screen.getByTestId('delete-parameter-testparam1-button')).toBeInTheDocument();

      // Delete should not have been called
      expect(mockDeleteParameter).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Parameters Interaction', () => {
    it('should handle multiple parameters independently', async () => {
      const mockUpdateDocument = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add first parameter
      fireEvent.click(addButton);
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Add second parameter
      fireEvent.click(addButton);
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Add third parameter
      fireEvent.click(addButton);
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param3' } });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // All parameters should exist
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();
      expect(screen.getByTestId('delete-parameter-param3-button')).toBeInTheDocument();

      // All parameters should have rename buttons
      expect(screen.getByTestId('rename-parameter-param1-button')).toBeInTheDocument();
      expect(screen.getByTestId('rename-parameter-param2-button')).toBeInTheDocument();
      expect(screen.getByTestId('rename-parameter-param3-button')).toBeInTheDocument();

      expect(mockUpdateDocument).toHaveBeenCalledTimes(3);
    });

    it('should delete one parameter while keeping others', async () => {
      const mockUpdateDocument = vi.fn();
      const mockDeleteParameter = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add two parameters
      fireEvent.click(addButton);
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      fireEvent.click(addButton);
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Both parameters exist
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      // Delete param1
      const deleteButton = screen.getByTestId('delete-parameter-param1-button');
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
      fireEvent.click(confirmButton);

      // param1 should be gone, param2 should remain
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-param1-button')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      expect(mockDeleteParameter).toHaveBeenCalledWith('param1');
    });

    it('should hide/show all parameters simultaneously', async () => {
      const mockUpdateDocument = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add two parameters
      fireEvent.click(addButton);
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      fireEvent.click(addButton);
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Both parameters visible
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      // Hide all
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      fireEvent.click(toggleButton);

      // Both should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-param1-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('delete-parameter-param2-button')).not.toBeInTheDocument();
      });

      // Show all
      fireEvent.click(toggleButton);

      // Both should be visible again
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show only header and add button when no parameters exist', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Header should exist
      expect(screen.getByTestId('source-parameters-header')).toBeInTheDocument();

      // Add button should exist
      expect(await screen.findByTestId('add-parameter-button')).toBeInTheDocument();

      // Toggle button should exist
      expect(screen.getByTestId('toggle-parameters-button')).toBeInTheDocument();

      // No parameters should be rendered
      const deleteButtons = screen.queryAllByTestId(/delete-parameter-.*-button/);
      expect(deleteButtons).toHaveLength(0);
    });

    it('should not show toggle button in read-only mode', async () => {
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Header should exist
      expect(screen.getByTestId('source-parameters-header')).toBeInTheDocument();

      // Add button should not exist in read-only
      expect(screen.queryByTestId('add-parameter-button')).not.toBeInTheDocument();

      // Toggle button should not exist in read-only
      expect(screen.queryByTestId('toggle-parameters-button')).not.toBeInTheDocument();
    });
  });

  describe('Parameter Actions Visibility', () => {
    it('should show rename and delete buttons for each parameter', async () => {
      const mockUpdateDocument = vi.fn();
      renderWithVirtuoso(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <MappingLinksProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} />
              </ExpansionPanels>
            </MappingLinksProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      fireEvent.click(addButton);

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      fireEvent.change(paramNameInput, { target: { value: 'testparam' } });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      fireEvent.click(submitButton);

      // Both action buttons should be visible
      await screen.findByTestId('rename-parameter-testparam-button');
      expect(screen.getByTestId('delete-parameter-testparam-button')).toBeInTheDocument();

      // Buttons should have correct attributes
      const renameButton = screen.getByTestId('rename-parameter-testparam-button');
      expect(renameButton).toHaveAttribute('title', 'Rename parameter');
      expect(renameButton).toHaveAttribute('aria-label', 'Rename parameter');

      const deleteButton = screen.getByTestId('delete-parameter-testparam-button');
      expect(deleteButton).toHaveAttribute('title', 'Delete parameter');
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete parameter');
    });
  });
});
