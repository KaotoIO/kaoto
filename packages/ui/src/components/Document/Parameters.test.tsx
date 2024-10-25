import { Parameters } from './Parameters';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { shipOrderXsd } from '../../stubs/data-mapper';
import { BrowserFilePickerMetadataProvider } from '../../stubs/BrowserFilePickerMetadataProvider';

describe('Parameters', () => {
  it('should add and remove a parameter', async () => {
    const mockUpdateDocument = jest.fn();
    const mockDeleteParameter = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
          <DataMapperCanvasProvider>
            <Parameters isReadOnly={false} />
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
    const paramNameInput = screen.getByTestId('add-new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const submitButton = screen.getByTestId('add-new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });
    expect(mockUpdateDocument.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls.length).toEqual(0);
    expect(mockUpdateDocument.mock.calls[0][0]['name']).toEqual('testparam1');
    const deleteButton = screen.getByTestId('delete-parameter-testparam1-button');
    act(() => {
      fireEvent.click(deleteButton);
    });
    const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmButton);
    });
    expect(mockUpdateDocument.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls.length).toEqual(1);
    expect(mockDeleteParameter.mock.calls[0][0]).toEqual('testparam1');
    await screen.findByTestId('add-parameter-button');
    const notexist = screen.queryByTestId('delete-parameter-testparam1-button');
    expect(notexist).toBeFalsy();
  });

  it('should show validation error for invalid parameter name', async () => {
    const mockUpdateDocument = jest.fn();
    const mockDeleteParameter = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider onUpdateDocument={mockUpdateDocument} onDeleteParameter={mockDeleteParameter}>
          <DataMapperCanvasProvider>
            <Parameters isReadOnly={false} />
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
    let paramNameInput = screen.getByTestId('add-new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1::' } });
    });
    expect(screen.getByTestId('new-parameter-helper-text-invalid')).toBeInTheDocument();
    let submitButton = screen.getByTestId('add-new-parameter-submit-btn') as HTMLButtonElement;
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
    paramNameInput = screen.getByTestId('add-new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    expect(screen.getByTestId('new-parameter-helper-text-duplicate')).toBeInTheDocument();
    submitButton = screen.getByTestId('add-new-parameter-submit-btn') as HTMLButtonElement;
    expect(submitButton.disabled).toBeTruthy();
  });

  it('should attach and detach a schema', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <Parameters isReadOnly={false} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const addButton = await screen.findByTestId('add-parameter-button');
    act(() => {
      fireEvent.click(addButton);
    });
    const paramNameInput = screen.getByTestId('add-new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam1' } });
    });
    const submitButton = screen.getByTestId('add-new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });
    const attachButton = screen.getByTestId('attach-schema-param-testparam1-button');
    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = screen.getByTestId('attach-schema-file-input');
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });
    const shipTo = await screen.findByText('ShipTo');
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
});
