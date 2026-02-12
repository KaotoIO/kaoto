import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';
import { shipOrderJsonSchema, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import { ParametersSection } from './Parameters';

describe('ParametersSection', () => {
  it('should add, rename, and remove a parameter', async () => {
    const mockUpdateDocument = jest.fn();
    const mockDeleteParameter = jest.fn();
    const mockRenameParameter = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider
          onUpdateDocument={mockUpdateDocument}
          onDeleteParameter={mockDeleteParameter}
          onRenameParameter={mockRenameParameter}
        >
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    expect(mockUpdateDocument.mock.calls.length).toEqual(0);
    expect(mockDeleteParameter.mock.calls.length).toEqual(0);
    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });
    expect(mockUpdateDocument.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls.length).toEqual(0);
    expect(mockUpdateDocument.mock.calls[0][0]['name']).toEqual('testparam1');

    const renameButton = screen.getByTestId('rename-parameter-testparam1-button');
    act(() => {
      fireEvent.click(renameButton);
    });
    act(() => {
      fireEvent.change(screen.getByTestId('new-parameter-name-input'), { target: { value: 'testparam2' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));
    });
    expect(mockRenameParameter).toHaveBeenCalledTimes(1);

    const deleteButton = screen.getByTestId('delete-parameter-testparam2-button');
    act(() => {
      fireEvent.click(deleteButton);
    });
    const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(mockUpdateDocument.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls[0][0]).toEqual('testparam2');
    await screen.findByTestId('add-parameter-button');
    const notexist = screen.queryByTestId('delete-parameter-testparam2-button');
    expect(notexist).toBeFalsy();
  });

  it('should show validation error for invalid parameter name', async () => {
    const mockUpdateDocument = jest.fn();
    const mockDeleteParameter = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    expect(mockUpdateDocument.mock.calls.length).toEqual(0);
    expect(mockDeleteParameter.mock.calls.length).toEqual(0);
    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });
    let paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1::' } });
    });
    const invalidError = screen.getByTestId('new-parameter-name-input-error');
    expect(invalidError).toBeInTheDocument();
    expect(invalidError).toHaveTextContent("Invalid parameter name 'testparam1::': it must be a valid QName");
    let submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    expect(submitButton.disabled).toBeFalsy();
    act(() => {
      fireEvent.click(submitButton);
    });
    act(() => {
      fireEvent.click(addButton);
    });
    paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const duplicateError = screen.getByTestId('new-parameter-name-input-error');
    expect(duplicateError).toBeInTheDocument();
    expect(duplicateError).toHaveTextContent("Parameter 'testparam1' already exists");
    submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();
  });

  it('should attach and detach a schema', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });

    const attachButton = screen.getByTestId('attach-schema-param-testparam1-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const importButton = screen.getByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    const fileInput = screen.getByTestId('attach-schema-file-input');
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
      const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlSchemaRadio.checked).toBeTruthy();
      const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
      expect(jsonSchemaRadio.checked).toBeFalsy();
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    const shipTo = await screen.findByTestId(/node-source-fx-ShipTo.*/);
    expect(shipTo).toBeTruthy();

    const detachButton = screen.getByTestId('detach-schema-param-testparam1-button');
    act(() => {
      fireEvent.click(detachButton);
    });
    const detachConfirmButton = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(detachConfirmButton);
    });
    await screen.findByTestId('add-parameter-button');
    expect(screen.queryByTestId('ShipTo')).toBeFalsy();
  });

  it('should attach JSON schema', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });
    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });

    const attachButton = screen.getByTestId('attach-schema-param-testparam1-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const importButton = screen.getByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileContent = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', { type: 'text/plain' });
    const fileInput = screen.getByTestId('attach-schema-file-input');
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      screen.getByTestId('attach-schema-file-item-ShipOrder.json');
      const jsonSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-json');
      expect(jsonSchemaRadio.checked).toBeTruthy();
      const xmlSchemaRadio: HTMLInputElement = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlSchemaRadio.checked).toBeFalsy();
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    const shipTo = await screen.findByText('map [@key = ShipTo]');
    expect(shipTo).toBeTruthy();
  });

  it('should be read-only when isReadOnly is true', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={true} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = screen.queryByTestId('add-parameter-button');
    expect(addButton).not.toBeInTheDocument();
  });

  it('should cancel adding new parameter', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });

    const cancelButton = screen.getByTestId('new-parameter-cancel-btn');
    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(screen.queryByTestId('new-parameter-name-input')).not.toBeInTheDocument();
  });

  // Note: Test removed - expansion behavior is now managed by ExpansionPanel component
  // and tested separately in ExpansionPanel.test.tsx

  it('should handle empty parameter name validation', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });

    const submitButton = screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    expect(paramNameInput).toHaveAttribute('placeholder', 'parameter name');
  });

  it('should handle parameter submission with duplicate parameter check', async () => {
    const mockUpdateDocument = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
          <DataMapperCanvasProvider>
            <ExpansionPanels>
              <ParametersSection isReadOnly={false} onScroll={() => {}} />
            </ExpansionPanels>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });

    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });

    // Try to add the same parameter again - should be prevented but handled gracefully
    act(() => {
      fireEvent.click(addButton);
    });

    const paramNameInput2 = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput2, { target: { value: 'testparam1' } });
    });

    const submitButton2 = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton2);
    });

    // Should still call updateDocument only once since duplicate is handled
    expect(mockUpdateDocument).toHaveBeenCalledTimes(1);
  });

  describe('Show/Hide All Parameters Toggle', () => {
    it('should hide all parameters when toggle button is clicked', async () => {
      const mockUpdateDocument = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter first
      const addButton = await screen.findByTestId('add-parameter-button');
      act(() => {
        fireEvent.click(addButton);
      });

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
      });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Verify parameter is visible
      await screen.findByTestId('delete-parameter-testparam1-button');

      // Click toggle to hide parameters
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      act(() => {
        fireEvent.click(toggleButton);
      });

      // Parameter should no longer be in the DOM
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-testparam1-button')).not.toBeInTheDocument();
      });
    });

    it('should show all parameters when toggle button is clicked again', async () => {
      const mockUpdateDocument = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      act(() => {
        fireEvent.click(addButton);
      });

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
      });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      await screen.findByTestId('delete-parameter-testparam1-button');

      // Hide parameters
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      act(() => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-testparam1-button')).not.toBeInTheDocument();
      });

      // Show parameters again
      act(() => {
        fireEvent.click(toggleButton);
      });

      await screen.findByTestId('delete-parameter-testparam1-button');
    });

    it('should change toggle button icon and title when hiding/showing parameters', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const toggleButton = await screen.findByTestId('toggle-parameters-button');

      // Initially showing parameters - should have "Hide all parameters" title
      expect(toggleButton).toHaveAttribute('title', 'Hide all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all parameters');

      // Click to hide
      act(() => {
        fireEvent.click(toggleButton);
      });

      // Should now show "Show all parameters" title
      expect(toggleButton).toHaveAttribute('title', 'Show all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show all parameters');

      // Click to show again
      act(() => {
        fireEvent.click(toggleButton);
      });

      // Back to "Hide all parameters"
      expect(toggleButton).toHaveAttribute('title', 'Hide all parameters');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide all parameters');
    });
  });

  describe('Auto-Show Parameters', () => {
    it('should auto-show parameters when clicking add button while hidden', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Hide parameters first
      const toggleButton = await screen.findByTestId('toggle-parameters-button');
      act(() => {
        fireEvent.click(toggleButton);
      });

      // New parameter input should not be visible
      expect(screen.queryByTestId('new-parameter-name-input')).not.toBeInTheDocument();

      // Click add button
      const addButton = screen.getByTestId('add-parameter-button');
      act(() => {
        fireEvent.click(addButton);
      });

      // New parameter input should now be visible (auto-shown)
      expect(screen.getByTestId('new-parameter-name-input')).toBeInTheDocument();
    });
  });

  describe('Cancel Delete Parameter Modal', () => {
    it('should keep parameter when cancel button is clicked in delete modal', async () => {
      const mockUpdateDocument = jest.fn();
      const mockDeleteParameter = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      act(() => {
        fireEvent.click(addButton);
      });

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
      });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Click delete button
      const deleteButton = await screen.findByTestId('delete-parameter-testparam1-button');
      act(() => {
        fireEvent.click(deleteButton);
      });

      // Modal should be visible
      expect(screen.getByTestId('delete-parameter-modal')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByTestId('delete-parameter-modal-cancel-btn');
      act(() => {
        fireEvent.click(cancelButton);
      });

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
      const mockUpdateDocument = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add first parameter
      act(() => {
        fireEvent.click(addButton);
      });
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Add second parameter
      act(() => {
        fireEvent.click(addButton);
      });
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Add third parameter
      act(() => {
        fireEvent.click(addButton);
      });
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param3' } });
      });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

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
      const mockUpdateDocument = jest.fn();
      const mockDeleteParameter = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add two parameters
      act(() => {
        fireEvent.click(addButton);
      });
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      act(() => {
        fireEvent.click(addButton);
      });
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Both parameters exist
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      // Delete param1
      const deleteButton = screen.getByTestId('delete-parameter-param1-button');
      act(() => {
        fireEvent.click(deleteButton);
      });

      const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
      act(() => {
        fireEvent.click(confirmButton);
      });

      // param1 should be gone, param2 should remain
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-param1-button')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      expect(mockDeleteParameter).toHaveBeenCalledWith('param1');
    });

    it('should hide/show all parameters simultaneously', async () => {
      const mockUpdateDocument = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const addButton = await screen.findByTestId('add-parameter-button');

      // Add two parameters
      act(() => {
        fireEvent.click(addButton);
      });
      let paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param1' } });
      });
      let submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      act(() => {
        fireEvent.click(addButton);
      });
      paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'param2' } });
      });
      submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

      // Both parameters visible
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();

      // Hide all
      const toggleButton = screen.getByTestId('toggle-parameters-button');
      act(() => {
        fireEvent.click(toggleButton);
      });

      // Both should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('delete-parameter-param1-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('delete-parameter-param2-button')).not.toBeInTheDocument();
      });

      // Show all
      act(() => {
        fireEvent.click(toggleButton);
      });

      // Both should be visible again
      await screen.findByTestId('delete-parameter-param1-button');
      expect(screen.getByTestId('delete-parameter-param2-button')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show only header and add button when no parameters exist', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Header should exist
      expect(screen.getByText('Parameters')).toBeInTheDocument();

      // Add button should exist
      expect(await screen.findByTestId('add-parameter-button')).toBeInTheDocument();

      // Toggle button should exist
      expect(screen.getByTestId('toggle-parameters-button')).toBeInTheDocument();

      // No parameters should be rendered
      const deleteButtons = screen.queryAllByTestId(/delete-parameter-.*-button/);
      expect(deleteButtons).toHaveLength(0);
    });

    it('should not show toggle button in read-only mode', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={true} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Header should exist
      expect(screen.getByText('Parameters')).toBeInTheDocument();

      // Add button should not exist in read-only
      expect(screen.queryByTestId('add-parameter-button')).not.toBeInTheDocument();

      // Toggle button should not exist in read-only
      expect(screen.queryByTestId('toggle-parameters-button')).not.toBeInTheDocument();
    });
  });

  describe('Parameter Actions Visibility', () => {
    it('should show rename and delete buttons for each parameter', async () => {
      const mockUpdateDocument = jest.fn();
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider onUpdateDocument={mockUpdateDocument}>
            <DataMapperCanvasProvider>
              <ExpansionPanels>
                <ParametersSection isReadOnly={false} onScroll={() => {}} />
              </ExpansionPanels>
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      // Add a parameter
      const addButton = await screen.findByTestId('add-parameter-button');
      act(() => {
        fireEvent.click(addButton);
      });

      const paramNameInput = screen.getByTestId('new-parameter-name-input');
      act(() => {
        fireEvent.change(paramNameInput, { target: { value: 'testparam' } });
      });

      const submitButton = screen.getByTestId('new-parameter-submit-btn');
      act(() => {
        fireEvent.click(submitButton);
      });

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
