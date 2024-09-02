import { AttachSchemaButton } from './AttachSchemaButton';
import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasProvider } from '../../../providers/CanvasProvider';
import { DocumentType } from '../../../models/path';
import { BODY_DOCUMENT_ID } from '../../../models/document';
import { DataMapperProvider } from '../../../providers';
import { CommonUtil } from '../../../util';
import { TestUtil } from '../../../test/test-util';

describe('AttachSchemaButton', () => {
  it('should invoke onClick()', () => {
    const spyOnClick = jest.spyOn(HTMLInputElement.prototype, 'click');
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    const attachButton = screen.getByTestId('attach-schema-sourceBody-Body-button');
    expect(spyOnClick.mock.calls.length).toEqual(0);
    fireEvent.click(attachButton);
    expect(spyOnClick.mock.calls.length).toBeGreaterThan(0);
  });

  it('should invoke onImport()', async () => {
    const mockOnImport = jest.spyOn(CommonUtil, 'readFileAsString');
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    const fileContent = new File([new Blob([TestUtil.orderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    const fileInput = screen.getByTestId('attach-schema-sourceBody-Body-file-input');
    fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    expect(mockOnImport.mock.calls.length).toEqual(1);
  });
});
