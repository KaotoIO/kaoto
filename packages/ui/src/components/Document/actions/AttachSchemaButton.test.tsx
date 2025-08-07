import { AttachSchemaButton } from './AttachSchemaButton';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { BODY_DOCUMENT_ID, DocumentType } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { readFileAsString } from '../../../stubs/read-file-as-string';

import {
  noTopElementXsd,
  shipOrderEmptyFirstLineXsd,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
  shipOrderXsd,
} from '../../../stubs/datamapper/data-mapper';
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

  it('should open modal', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton documentType={DocumentType.SOURCE_BODY} documentId={BODY_DOCUMENT_ID} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    let modal = screen.queryByTestId('attach-schema-modal');
    expect(modal).toBeNull();

    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });

    modal = screen.queryByTestId('attach-schema-modal');
    expect(modal).toBeInTheDocument();
  });

  it('should import XML schema', async () => {
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
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('ShipOrder.xsd');
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(mockReadFileAsString.mock.calls.length).toEqual(1);
    });
  });

  it('should import JSON schema', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton documentType={DocumentType.TARGET_BODY} documentId={BODY_DOCUMENT_ID} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );
    const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('ShipOrder.json');
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(false);
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(mockReadFileAsString.mock.calls.length).toEqual(1);
    });
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
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([noTopElementXsd])], 'NoTopElement.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('NoTopElement.xsd');
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(capturedAlerts.length).toEqual(1);
      expect(capturedAlerts[0].title).toContain('no top level Element');
    });
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
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderEmptyFirstLineXsd])], 'ShipOrderEmptyFirstLine.xsd', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('ShipOrderEmptyFirstLine.xsd');
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(capturedAlerts.length).toEqual(1);
      expect(capturedAlerts[0].title).toContain('an XML declaration must be at the start of the document');
    });
  });

  it('should show a toast alert when attaching JSON schema on the source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
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
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      expect(capturedAlerts.length).toEqual(1);
      expect(capturedAlerts[0].title).toContain('JSON source body is not supported');
    });
  });

  it('should show a toast alert when attaching unknown file to source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
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
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderJsonXslt])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      expect(capturedAlerts.length).toEqual(1);
      expect(capturedAlerts[0].title).toContain(
        "Unknown file extension '.xsl'. Only XML schema file (.xml, .xsd) is supported.",
      );
    });
  });

  it('should show a toast alert when attaching unknown file to target body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TestAlertCapture>
              <AttachSchemaButton documentType={DocumentType.TARGET_BODY} documentId={BODY_DOCUMENT_ID} />
            </TestAlertCapture>
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });
    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([shipOrderJsonXslt])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      expect(capturedAlerts.length).toEqual(1);
      expect(capturedAlerts[0].title).toContain(
        "Unknown file extension '.xsl'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.",
      );
    });
  });
});
