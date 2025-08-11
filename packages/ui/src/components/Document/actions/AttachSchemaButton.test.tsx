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

  it('should show inline error for invalid schema', async () => {
    mockReadFileAsString.mockResolvedValue(noTopElementXsd);
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
    const fileContent = new File([new Blob([noTopElementXsd])], 'NoTopElement.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-modal-text-helper');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('no top level Element');

      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });
  });

  it('should show inline error for XML parse error', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderEmptyFirstLineXsd);
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
    const fileContent = new File([new Blob([shipOrderEmptyFirstLineXsd])], 'ShipOrderEmptyFirstLine.xsd', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-modal-text-helper');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('an XML declaration must be at the start of the document');

      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });
  });

  it('should show inline error when attaching JSON schema on the source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
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
    const fileContent = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-modal-text-helper');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('JSON source body is not supported');

      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });
  });

  it('should show inline error when attaching unknown file to source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
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
    const fileContent = new File([new Blob([shipOrderJsonXslt])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-modal-text-helper');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Only XML schema file (.xml, .xsd) is supported.",
      );

      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });
  });

  it('should show inline error when attaching unknown file to target body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
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
    const fileContent = new File([new Blob([shipOrderJsonXslt])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {});

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toEqual(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-modal-text-helper');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.",
      );

      const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
      expect(text.value).toEqual('');
    });
  });

  it('should close modal when cancel is clicked', async () => {
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

    let modal = screen.queryByTestId('attach-schema-modal');
    expect(modal).toBeInTheDocument();

    const cancelButton = await screen.findByTestId('attach-schema-modal-btn-cancel');
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      modal = screen.queryByTestId('attach-schema-modal');
      expect(modal).not.toBeInTheDocument();
    });
  });

  it('should change schema type when radio button is clicked', async () => {
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

    const xmlRadio = await screen.findByTestId('attach-schema-modal-option-xml');
    const jsonRadio = await screen.findByTestId('attach-schema-modal-option-json');

    expect(xmlRadio).toBeChecked();
    expect(jsonRadio).not.toBeChecked();

    act(() => {
      fireEvent.click(jsonRadio);
    });

    expect(xmlRadio).not.toBeChecked();
    expect(jsonRadio).toBeChecked();

    act(() => {
      fireEvent.click(xmlRadio);
    });

    expect(xmlRadio).toBeChecked();
    expect(jsonRadio).not.toBeChecked();
  });
});
