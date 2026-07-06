import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MockedFunction } from 'vitest';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../../../../models/datamapper/document';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DocumentService } from '../../../../services/document/document.service';
import { BrowserFilePickerMetadataProvider } from '../../../../stubs/BrowserFilePickerMetadataProvider';
import {
  getMultiIncludeComponentAXsd,
  getMultiIncludeMainXsd,
  getMultipleElementsXsd,
  getNoTopElementXsd,
  getShipOrderEmptyFirstLineXsd,
  getShipOrderJsonSchema,
  getShipOrderJsonXslt,
  getShipOrderXsd,
} from '../../../../stubs/datamapper/data-mapper';
import { readFileAsString } from '../../../../stubs/read-file-as-string';
import { AttachSchemaModal } from './AttachSchemaModal';

vi.mock('../../../../stubs/read-file-as-string');
const mockReadFileAsString = readFileAsString as MockedFunction<typeof readFileAsString>;

async function findRootElementInput() {
  const container = await screen.findByTestId('attach-schema-root-element');
  return container.querySelector('input') as HTMLInputElement;
}

describe('AttachSchemaModal', () => {
  afterAll(() => {
    mockReadFileAsString.mockReset();
  });

  it('should import XML schema', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderXsd());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
      expect(fileItem).toBeInTheDocument();
      expect(fileItem.textContent).toBe('ShipOrder.xsd');
    });

    const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(mockReadFileAsString.mock.calls).toHaveLength(1);
    });
  });

  it('should import JSON schema', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderJsonSchema());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Target"
            jsonAllowed
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderJsonSchema()])], 'ShipOrder.json', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.json');
      expect(fileItem).toBeInTheDocument();
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toBe(false);
    act(() => {
      fireEvent.click(commitButton);
    });

    await waitFor(() => {
      expect(mockReadFileAsString.mock.calls).toHaveLength(1);
    });
  });

  it('should show inline error for invalid schema', async () => {
    mockReadFileAsString.mockResolvedValue(getNoTopElementXsd());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getNoTopElementXsd()])], 'NoTopElement.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('no top level Element');
    });
  });

  it('should show inline error for XML parse error', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderEmptyFirstLineXsd());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderEmptyFirstLineXsd()])], 'ShipOrderEmptyFirstLine.xsd', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrderEmptyFirstLine.xsd');
      expect(fileItem.closest('[class*="data-list"]') || fileItem.parentElement).toBeDefined();
      expect(fileItem.parentElement!.textContent).toContain('an XML declaration must be at the start of the document');
    });
  });

  it('should show inline error when attaching JSON schema on the source body', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderJsonSchema());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderJsonSchema()])], 'ShipOrder.json', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toBe(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('JSON source body is not supported');
    });
  });

  it('should show inline error when attaching unknown file to source body', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderJsonXslt());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderJsonXslt()])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toBe(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Only XML schema file (.xml, .xsd) is supported.",
      );
    });
  });

  it('should show inline error when attaching unknown file to target body', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderJsonXslt());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Target"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderJsonXslt()])], 'ShipOrderJson.xsl', {
      type: 'text/plain',
    });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {});

    const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
    expect(commitButton.disabled).toBe(true);

    await waitFor(() => {
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.",
      );
    });
  });

  it('should close modal when cancel is clicked', async () => {
    const onModalClose = vi.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={onModalClose}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const modal = screen.queryByTestId('attach-schema-modal');
    expect(modal).toBeInTheDocument();

    const cancelButton = await screen.findByTestId('attach-schema-modal-btn-cancel');
    act(() => {
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(onModalClose).toHaveBeenCalled();
    });
  });

  it('should change schema type when radio button is clicked', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Target"
            jsonAllowed
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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

  it('should show no files selected message when modal opens', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.SOURCE_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Source"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const noFiles = screen.getByTestId('attach-schema-no-files');
    expect(noFiles).toBeInTheDocument();
    expect(noFiles.textContent).toContain('No files selected');
  });

  it('should disable radio buttons when files are selected', async () => {
    mockReadFileAsString.mockResolvedValue(getShipOrderXsd());
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Target"
          />
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const xmlRadio = await screen.findByTestId('attach-schema-modal-option-xml');
    expect(xmlRadio).not.toBeDisabled();

    const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
    act(() => {
      fireEvent.click(importButton);
    });

    const fileInput = await screen.findByTestId('attach-schema-file-input');
    const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
    act(() => {
      fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
    });

    await waitFor(() => {
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
      expect(fileItem).toBeInTheDocument();
    });

    const xmlRadioAfter = screen.getByTestId('attach-schema-modal-option-xml');
    expect(xmlRadioAfter).toBeDisabled();
  });

  describe('Root Element Selection', () => {
    it('should show root element selector when multiple elements are available', async () => {
      mockReadFileAsString.mockResolvedValue(getMultipleElementsXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getMultipleElementsXsd()])], 'MultipleElements.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const input = await findRootElementInput();
      expect(input.value).toBe('Order');

      act(() => {
        fireEvent.focus(input);
      });

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-select');
        expect(rootElementSelect.querySelector('[role="option"]')).toBeInTheDocument();
        expect(screen.getByText('Order')).toBeInTheDocument();
        expect(screen.getByText('Invoice')).toBeInTheDocument();
        expect(screen.getByText('Shipment')).toBeInTheDocument();
      });
    });

    it('should show root element selector for single element schemas with pre-selected option', async () => {
      mockReadFileAsString.mockResolvedValue(getShipOrderXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const input = await findRootElementInput();
      expect(input.value).toBe('ShipOrder');

      act(() => {
        fireEvent.focus(input);
      });

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-select');
        const options = rootElementSelect.querySelectorAll('[role="option"]');
        expect(options).toHaveLength(1);
        expect(screen.getByText('ShipOrder')).toBeInTheDocument();
      });
    });

    it('should allow user to select different root elements', async () => {
      mockReadFileAsString.mockResolvedValue(getMultipleElementsXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getMultipleElementsXsd()])], 'MultipleElements.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const input = await findRootElementInput();
      expect(input.value).toBe('Order');

      act(() => {
        fireEvent.focus(input);
      });

      act(() => {
        fireEvent.change(input, { target: { value: 'Invoice' } });
      });
      expect(input.value).toBe('Invoice');

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-select');
        const options = rootElementSelect.querySelectorAll('[role="option"]');
        expect(options).toHaveLength(1);
        expect(screen.getByText('Invoice')).toBeInTheDocument();
      });
    });

    it('should commit schema with selected root element', async () => {
      mockReadFileAsString.mockResolvedValue(getMultipleElementsXsd());
      let dataMapperContext: ReturnType<typeof useDataMapper>;

      const TestComponent = () => {
        dataMapperContext = useDataMapper();
        return (
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={vi.fn()}
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
            actionName="Attach"
            documentTypeLabel="Target"
          />
        );
      };

      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <TestComponent />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getMultipleElementsXsd()])], 'MultipleElements.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const input = await findRootElementInput();
      act(() => {
        fireEvent.focus(input);
      });

      const invoice = await screen.findByText('Invoice');

      act(() => {
        fireEvent.click(invoice);
      });

      const commitButton = await screen.findByTestId('attach-schema-modal-btn-attach');
      expect(commitButton).not.toBeDisabled();

      act(() => {
        fireEvent.click(commitButton);
      });

      await waitFor(() => {
        const rootElementQName = DocumentService.getRootElementQName(dataMapperContext!.targetBodyDocument);
        expect(rootElementQName).toBeDefined();
        expect(rootElementQName?.getLocalPart()).toBe('Invoice');
        expect(rootElementQName?.getNamespaceURI()).toBe('io.kaoto.datamapper.test.multiple');
      });
    });

    it('should not show root element selector for JSON schemas', async () => {
      mockReadFileAsString.mockResolvedValue(getShipOrderJsonSchema());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getShipOrderJsonSchema()])], 'ShipOrder.json', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.json');
        expect(fileItem).toBeInTheDocument();
      });

      const rootElementSelector = screen.queryByTestId('attach-schema-root-element');
      expect(rootElementSelector).not.toBeInTheDocument();
    });

    it('should preserve root element selection when removing an unrelated file', async () => {
      mockReadFileAsString.mockResolvedValue(getMultipleElementsXsd());

      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([getMultipleElementsXsd()])], 'MultipleElements.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, {
          target: { files: { item: (i: number) => [file1, file2][i], length: 2, 0: file1, 1: file2 } },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultipleElements.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      const input = await findRootElementInput();
      act(() => {
        fireEvent.focus(input);
      });

      const invoice = await screen.findByText('Invoice');
      act(() => {
        fireEvent.click(invoice);
      });

      await waitFor(async () => {
        const inputEl = await findRootElementInput();
        expect(inputEl.value).toBe('Invoice');
      });

      const removeButton = await screen.findByTestId('attach-schema-file-remove-ShipOrder.xsd');
      act(() => {
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('attach-schema-file-item-ShipOrder.xsd')).not.toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-MultipleElements.xsd')).toBeInTheDocument();
      });

      await waitFor(async () => {
        const inputEl = await findRootElementInput();
        expect(inputEl.value).toBe('Invoice');
      });
    });
  });

  describe('File Management', () => {
    it('should remove a single file from the list', async () => {
      mockReadFileAsString
        .mockResolvedValueOnce(getMultiIncludeMainXsd())
        .mockResolvedValueOnce(getMultiIncludeComponentAXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([getMultiIncludeMainXsd()])], 'MultiIncludeMain.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([getMultiIncludeComponentAXsd()])], 'MultiIncludeComponentA.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, {
          target: { files: { item: (i: number) => [file1, file2][i], length: 2, 0: file1, 1: file2 } },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeMain.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeComponentA.xsd')).toBeInTheDocument();
      });

      const removeButton = await screen.findByTestId('attach-schema-file-remove-MultiIncludeComponentA.xsd');
      act(() => {
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeMain.xsd')).toBeInTheDocument();
        expect(screen.queryByTestId('attach-schema-file-item-MultiIncludeComponentA.xsd')).not.toBeInTheDocument();
      });
    });

    it('should remove all files and reset state', async () => {
      mockReadFileAsString.mockResolvedValue(getShipOrderXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      const removeAllButton = await screen.findByTestId('attach-schema-remove-all-btn');
      act(() => {
        fireEvent.click(removeAllButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('attach-schema-file-item-ShipOrder.xsd')).not.toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-no-files')).toBeInTheDocument();
      });

      const xmlRadio = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlRadio).not.toBeDisabled();
    });

    it('should show error when mixing XML and JSON schema files', async () => {
      mockReadFileAsString.mockResolvedValueOnce(getShipOrderXsd()).mockResolvedValueOnce(getShipOrderJsonSchema());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const xsdFile = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => xsdFile, length: 1, 0: xsdFile } } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(importButton);
      });

      const jsonFile = new File([new Blob([getShipOrderJsonSchema()])], 'ShipOrder.json', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => jsonFile, length: 1, 0: jsonFile } } });
      });

      await waitFor(() => {
        const errorItem = screen.getByTestId('attach-schema-error-0');
        expect(errorItem).toBeInTheDocument();
        expect(errorItem.textContent).toContain('Cannot mix schema types');
      });
    });

    it('should show warning items from schema analysis with missing includes', async () => {
      mockReadFileAsString.mockResolvedValue(getMultiIncludeMainXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getMultiIncludeMainXsd()])], 'MultiIncludeMain.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, {
          target: { files: { item: () => fileContent, length: 1, 0: fileContent } },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeMain.xsd')).toBeInTheDocument();
      });

      await waitFor(() => {
        const summaryEl = screen.queryByTestId('attach-schema-file-issues-summary');
        expect(summaryEl).toBeInTheDocument();
      });
    });

    it('should remove the last file and reset state', async () => {
      mockReadFileAsString.mockResolvedValue(getShipOrderXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      const removeButton = await screen.findByTestId('attach-schema-file-remove-ShipOrder.xsd');
      act(() => {
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('attach-schema-file-item-ShipOrder.xsd')).not.toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-no-files')).toBeInTheDocument();
      });

      const xmlRadio = screen.getByTestId('attach-schema-modal-option-xml');
      expect(xmlRadio).not.toBeDisabled();
    });

    it('should show filter toggles and allow toggling them', async () => {
      mockReadFileAsString
        .mockResolvedValueOnce(getMultiIncludeMainXsd())
        .mockResolvedValueOnce(getMultiIncludeComponentAXsd());
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([getMultiIncludeMainXsd()])], 'MultiIncludeMain.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([getMultiIncludeComponentAXsd()])], 'MultiIncludeComponentA.xsd', {
        type: 'text/plain',
      });
      act(() => {
        fireEvent.change(fileInput, {
          target: { files: { item: (i: number) => [file1, file2][i], length: 2, 0: file1, 1: file2 } },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeMain.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-MultiIncludeComponentA.xsd')).toBeInTheDocument();
      });

      const filterGroup = screen.queryByTestId('attach-schema-file-filter');
      expect(filterGroup).toBeInTheDocument();

      const errorFilterButton = filterGroup!.querySelector('#toggle-filter-error') as HTMLButtonElement;
      expect(errorFilterButton).toBeInTheDocument();
      act(() => {
        fireEvent.click(errorFilterButton);
      });
      act(() => {
        fireEvent.click(errorFilterButton);
      });
    });

    it('should show attach button as disabled when no files are uploaded', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
      expect(commitButton.disabled).toBe(true);
    });

    it('should show parameter document type label', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={vi.fn()}
              documentType={DocumentType.PARAM}
              documentId="myParam"
              documentReferenceId="myParam"
              actionName="Attach"
              documentTypeLabel="Parameter: myParam"
            />
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const modal = screen.queryByTestId('attach-schema-modal');
      expect(modal).toBeInTheDocument();
      expect(modal!.textContent).toContain('Parameter: myParam');
    });

    describe('Loading state', () => {
      it('should disable button and show loading text after file selection', async () => {
        // Mock slow document creation to capture loading state
        let resolveCreate: (value: unknown) => void;
        const createPromise = new Promise((resolve) => {
          resolveCreate = resolve;
        });
        vi.spyOn(DocumentService, 'createDocument').mockReturnValue(createPromise as Promise<never>);
        mockReadFileAsString.mockResolvedValue(getShipOrderXsd());

        render(
          <BrowserFilePickerMetadataProvider>
            <DataMapperProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={vi.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperProvider>
          </BrowserFilePickerMetadataProvider>,
        );

        const importButton = await screen.findByTestId('attach-schema-modal-btn-file');

        // Button should be enabled initially with normal text
        expect(importButton).not.toBeDisabled();
        expect(importButton.textContent).toBe('Upload schema file(s)');

        act(() => {
          fireEvent.click(importButton);
        });

        const fileInput = await screen.findByTestId('attach-schema-file-input');
        const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
          // Give time for state updates
          await new Promise((resolve) => setTimeout(resolve, 50));
        });

        // After file selection, button should show loading state
        expect(importButton).toBeDisabled();
        expect(importButton.textContent).toContain('Uploading schema file(s)...');
        expect(screen.getByLabelText('Uploading schema file(s)')).toBeInTheDocument();

        // Resolve the document creation
        act(() => {
          resolveCreate!({ validationStatus: 'success', document: {}, documentDefinition: {} });
        });

        // Wait for processing to complete
        await waitFor(() => {
          expect(screen.queryByLabelText('Uploading schema file(s)')).not.toBeInTheDocument();
          expect(importButton).not.toBeDisabled();
          expect(importButton.textContent).toBe('Upload schema file(s)');
        });
      });

      it('should not show loading state while file picker is open', async () => {
        mockReadFileAsString.mockResolvedValue(getShipOrderXsd());

        render(
          <BrowserFilePickerMetadataProvider>
            <DataMapperProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={vi.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperProvider>
          </BrowserFilePickerMetadataProvider>,
        );

        const importButton = await screen.findByTestId('attach-schema-modal-btn-file');

        act(() => {
          fireEvent.click(importButton);
        });

        // Loading state should not appear immediately when file picker opens
        expect(screen.queryByLabelText('Uploading schema file(s)')).not.toBeInTheDocument();
        expect(importButton).not.toBeDisabled();
        expect(importButton.textContent).toBe('Upload schema file(s)');
      });

      it('should clear loading state even if processing fails', async () => {
        mockReadFileAsString.mockRejectedValue(new Error('File read error'));

        render(
          <BrowserFilePickerMetadataProvider>
            <DataMapperProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={vi.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperProvider>
          </BrowserFilePickerMetadataProvider>,
        );

        const importButton = await screen.findByTestId('attach-schema-modal-btn-file');

        act(() => {
          fireEvent.click(importButton);
        });

        const fileInput = await screen.findByTestId('attach-schema-file-input');
        const fileContent = new File([new Blob([getShipOrderXsd()])], 'ShipOrder.xsd', { type: 'text/plain' });

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
        });

        // Wait for error handling and loading state to clear
        await waitFor(() => {
          expect(screen.queryByLabelText('Uploading schema file(s)')).not.toBeInTheDocument();
          expect(importButton).not.toBeDisabled();
          expect(importButton.textContent).toBe('Upload schema file(s)');
        });
      });
    });
  });
});
