import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';
import { shipOrderJsonSchema, shipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import { ParametersSection } from './Parameters';

// Helper to render ParametersSection with required ExpansionPanels wrapper
const renderParametersSection = (props: { isReadOnly: boolean }) => {
  return render(
    <BrowserFilePickerMetadataProvider>
      <DataMapperProvider
        onUpdateDocument={props.onUpdateDocument}
        onDeleteParameter={props.onDeleteParameter}
        onRenameParameter={props.onRenameParameter}
      >
        <DataMapperCanvasProvider>
          <ExpansionPanels>
            <ParametersSection isReadOnly={props.isReadOnly} onScroll={() => {}} />
          </ExpansionPanels>
        </DataMapperCanvasProvider>
      </DataMapperProvider>
    </BrowserFilePickerMetadataProvider>,
  );
};

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
    expect(screen.getByTestId('new-parameter-helper-text-invalid')).toBeInTheDocument();
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
    expect(screen.getByTestId('new-parameter-helper-text-duplicate')).toBeInTheDocument();
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
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('ShipOrder.xsd');
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
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('ShipOrder.json');
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
});
