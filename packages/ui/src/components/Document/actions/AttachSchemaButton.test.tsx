import { AttachSchemaButton } from './AttachSchemaButton';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DocumentType } from '../../../models/datamapper/path';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { readFileAsString } from '../../../utils/read-file-as-string';

import { shipOrderXsd } from '../../../stubs/data-mapper';

jest.mock('../../../utils/read-file-as-string');
const mockReadFileAsString = readFileAsString as jest.MockedFunction<typeof readFileAsString>;

describe('AttachSchemaButton', () => {
  afterAll(() => {
    mockReadFileAsString.mockReset();
  });

  it('should invoke onClick()', async () => {
    const spyOnClick = jest.spyOn(HTMLInputElement.prototype, 'click');
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    expect(spyOnClick.mock.calls.length).toEqual(0);
    act(() => {
      fireEvent.click(attachButton);
    });
    expect(spyOnClick.mock.calls.length).toBeGreaterThan(0);
  });

  it('should invoke onImport()', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderXsd);
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = await screen.findByTestId('attach-schema-sourceBody-Body-file-input');
    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });
    await screen.findByTestId('attach-schema-sourceBody-Body-button');
    expect(mockReadFileAsString.mock.calls.length).toEqual(1);
  });
});
