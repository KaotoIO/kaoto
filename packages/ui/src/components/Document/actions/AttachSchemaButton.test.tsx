import { AttachSchemaButton } from './AttachSchemaButton';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DocumentType } from '../../../models/datamapper/path';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { readFileAsString } from '../../../stubs/read-file-as-string';

import { noTopElementXsd, shipOrderEmptyFirstLineXsd, shipOrderXsd } from '../../../stubs/data-mapper';
import { BrowserFilePickerMetadataProvider } from '../../../stubs/BrowserFilePickerMetadataProvider';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { AlertProps } from '@patternfly/react-core';

jest.mock('../../../stubs/read-file-as-string');
const mockReadFileAsString = readFileAsString as jest.MockedFunction<typeof readFileAsString>;

describe('AttachSchemaButton', () => {
  afterAll(() => {
    mockReadFileAsString.mockReset();
  });

  it('should invoke onClick()', async () => {
    const spyOnClick = jest.spyOn(HTMLInputElement.prototype, 'click');
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
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
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });
    await screen.findByTestId('attach-schema-sourceBody-Body-button');
    expect(mockReadFileAsString.mock.calls.length).toEqual(1);
  });

  let capturedAlerts: Partial<AlertProps>[] = [];
  const TestAlertCapture: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const { alerts } = useDataMapper();
    useEffect(() => {
      capturedAlerts = alerts;
    }, [alerts]);
    return <>{children}</>;
  };

  it('should show a toast alert for invalid schema', async () => {
    mockReadFileAsString.mockResolvedValue(noTopElementXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TestAlertCapture>
              <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
            </TestAlertCapture>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([noTopElementXsd])], 'NoTopElement.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });
    await screen.findByTestId('attach-schema-sourceBody-Body-button');
    expect(capturedAlerts.length).toEqual(1);
    expect(capturedAlerts[0].title).toContain('no top level Element');
  });

  it('should show a toast alert for XML parse error', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderEmptyFirstLineXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TestAlertCapture>
              <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
            </TestAlertCapture>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderEmptyFirstLineXsd])], 'ShipOrderEmptyFirstLine.xsd', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });
    await screen.findByTestId('attach-schema-sourceBody-Body-button');
    expect(capturedAlerts.length).toEqual(1);
    expect(capturedAlerts[0].title).toContain('an XML declaration must be at the start of the document');
  });
});
