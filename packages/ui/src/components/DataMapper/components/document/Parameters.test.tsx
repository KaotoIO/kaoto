import { Parameters } from './Parameters';
import { DataMapperProvider } from '../../providers';
import { CanvasProvider } from '../../providers/CanvasProvider';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TestUtil } from '../../test/test-util';

describe('Parameters', () => {
  it('should add and remove a parameter', async () => {
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <Parameters />
        </CanvasProvider>
      </DataMapperProvider>,
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
    const deleteButton = screen.getByTestId('delete-parameter-testparam1-button');
    act(() => {
      fireEvent.click(deleteButton);
    });
    const confirmButton = screen.getByTestId('delete-parameter-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmButton);
    });
    const notexist = screen.queryByTestId('delete-parameter-testparam1-button');
    expect(notexist).toBeFalsy();
  });

  it('should attach and detach a schema', async () => {
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <Parameters />
        </CanvasProvider>
      </DataMapperProvider>,
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
    const fileContent = new File([new Blob([TestUtil.orderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = screen.getByTestId('attach-schema-param-testparam1-file-input');
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
    expect(screen.queryByTestId('ShipTo')).toBeFalsy();
  });
});
