import {
  act,
  findByLabelText,
  fireEvent,
  getAllByLabelText,
  getByLabelText,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../../../../models/datamapper/document';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../../providers/datamapper-canvas.provider';
import { DocumentService } from '../../../../services/document.service';
import { BrowserFilePickerMetadataProvider } from '../../../../stubs/BrowserFilePickerMetadataProvider';
import {
  multiIncludeComponentAXsd,
  multiIncludeMainXsd,
  multipleElementsXsd,
  noTopElementXsd,
  shipOrderEmptyFirstLineXsd,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
  shipOrderXsd,
} from '../../../../stubs/datamapper/data-mapper';
import { readFileAsString } from '../../../../stubs/read-file-as-string';
import { AttachSchemaModal } from './AttachSchemaModal';

jest.mock('../../../../stubs/read-file-as-string');
const mockReadFileAsString = readFileAsString as jest.MockedFunction<typeof readFileAsString>;

describe('AttachSchemaModal', () => {
  afterAll(() => {
    mockReadFileAsString.mockReset();
  });

  it('should import XML schema', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
      expect(fileItem).toBeInTheDocument();
      expect(fileItem.textContent).toEqual('ShipOrder.xsd');
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
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.json');
      expect(fileItem).toBeInTheDocument();
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
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('no top level Element');
    });
  });

  it('should show inline error for XML parse error', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderEmptyFirstLineXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrderEmptyFirstLine.xsd');
      expect(fileItem.closest('[class*="data-list"]') || fileItem.parentElement).toBeDefined();
      expect(fileItem.parentElement!.textContent).toContain('an XML declaration must be at the start of the document');
    });
  });

  it('should show inline error when attaching JSON schema on the source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain('JSON source body is not supported');
    });
  });

  it('should show inline error when attaching unknown file to source body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Only XML schema file (.xml, .xsd) is supported.",
      );
    });
  });

  it('should show inline error when attaching unknown file to target body', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderJsonXslt);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

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
      const helperText = screen.getByTestId('attach-schema-error-0');
      expect(helperText).toBeInTheDocument();
      expect(helperText.textContent).toContain(
        "Unknown file extension '.xsl'. Either XML schema (.xsd, .xml) or JSON schema (.json) file is supported.",
      );
    });
  });

  it('should close modal when cancel is clicked', async () => {
    const onModalClose = jest.fn();
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={onModalClose}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
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
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperCanvasProvider>
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
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Source"
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const noFiles = screen.getByTestId('attach-schema-no-files');
    expect(noFiles).toBeInTheDocument();
    expect(noFiles.textContent).toContain('No files selected');
  });

  it('should disable radio buttons when files are selected', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaModal
              isModalOpen={true}
              onModalClose={jest.fn()}
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
              actionName="Attach"
              documentTypeLabel="Target"
            />
          </DataMapperCanvasProvider>
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
    const fileContent = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
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
      mockReadFileAsString.mockResolvedValue(multipleElementsXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const rootElementSelector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
      const typeaheadInput = getByLabelText(rootElementSelector, 'Attach schema / Choose Root Element');
      expect(typeaheadInput.getAttribute('value')).toEqual('Order');

      const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
      act(() => {
        fireEvent.click(dropdownToggle);
      });

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-typeahead-select');
        const order = getByLabelText(rootElementSelect, 'option order');
        expect(order.getAttribute('aria-selected')).toEqual('true');

        const invoice = getByLabelText(rootElementSelect, 'option invoice');
        expect(invoice.getAttribute('aria-selected')).toEqual('false');

        const shipment = getByLabelText(rootElementSelect, 'option shipment');
        expect(shipment.getAttribute('aria-selected')).toEqual('false');
      });
    });

    it('should show root element selector for single element schemas with pre-selected option', async () => {
      mockReadFileAsString.mockResolvedValue(shipOrderXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

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
        const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const rootElementSelector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
      const typeaheadInput = getByLabelText(rootElementSelector, 'Attach schema / Choose Root Element');
      expect(typeaheadInput.getAttribute('value')).toEqual('ShipOrder');

      const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
      act(() => {
        fireEvent.click(dropdownToggle);
      });

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-typeahead-select');
        const options = getAllByLabelText(rootElementSelect, /option.*/);
        expect(options.length).toEqual(1);
        expect(options[0].getAttribute('aria-label')).toEqual('option shiporder');
        expect(options[0].getAttribute('aria-selected')).toEqual('true');
      });
    });

    it('should allow user to select different root elements', async () => {
      mockReadFileAsString.mockResolvedValue(multipleElementsXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Target"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const rootElementSelector = await screen.findByTestId('attach-schema-root-element-typeahead-select-input');
      const typeaheadInput = getByLabelText(rootElementSelector, 'Attach schema / Choose Root Element');
      expect(typeaheadInput.getAttribute('value')).toEqual('Order');

      const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
      act(() => {
        fireEvent.click(dropdownToggle);
      });

      act(() => {
        fireEvent.change(typeaheadInput, { target: { value: 'Invoice' } });
      });
      expect(typeaheadInput.getAttribute('value')).toEqual('Invoice');

      await waitFor(() => {
        const rootElementSelect = screen.getByTestId('attach-schema-root-element-typeahead-select');
        const options = getAllByLabelText(rootElementSelect, /option.*/);
        expect(options.length).toEqual(1);
        expect(options[0].getAttribute('aria-label')).toEqual('option invoice');
        expect(options[0].getAttribute('aria-selected')).toEqual('false');
      });
    });

    it('should commit schema with selected root element', async () => {
      mockReadFileAsString.mockResolvedValue(multipleElementsXsd);
      let dataMapperContext: ReturnType<typeof useDataMapper>;

      const TestComponent = () => {
        dataMapperContext = useDataMapper();
        return (
          <AttachSchemaModal
            isModalOpen={true}
            onModalClose={jest.fn()}
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
            <DataMapperCanvasProvider>
              <TestComponent />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const fileItem = screen.getByTestId('attach-schema-file-item-MultipleElements.xsd');
        expect(fileItem).toBeInTheDocument();
      });

      const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
      act(() => {
        fireEvent.click(dropdownToggle);
      });

      const rootElementSelect = screen.getByTestId('attach-schema-root-element-typeahead-select');
      const invoice = await findByLabelText(rootElementSelect, 'option invoice');

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
        expect(rootElementQName?.getLocalPart()).toEqual('Invoice');
        expect(rootElementQName?.getNamespaceURI()).toEqual('io.kaoto.datamapper.test.multiple');
      });
    });

    it('should not show root element selector for JSON schemas', async () => {
      mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Target"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

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
        const fileItem = screen.getByTestId('attach-schema-file-item-ShipOrder.json');
        expect(fileItem).toBeInTheDocument();
      });

      const rootElementSelector = screen.queryByTestId('attach-schema-root-element-typeahead-select-input');
      expect(rootElementSelector).not.toBeInTheDocument();
    });

    it('should preserve root element selection when removing an unrelated file', async () => {
      mockReadFileAsString.mockResolvedValue(multipleElementsXsd);

      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, {
          target: { files: { item: (i: number) => [file1, file2][i], length: 2, 0: file1, 1: file2 } },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-MultipleElements.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      const dropdownToggle = screen.getByLabelText('Attach schema / Choose Root Element toggle');
      act(() => {
        fireEvent.click(dropdownToggle);
      });

      const rootElementSelect = screen.getByTestId('attach-schema-root-element-typeahead-select');
      const invoice = await findByLabelText(rootElementSelect, 'option invoice');
      act(() => {
        fireEvent.click(invoice);
      });

      await waitFor(() => {
        const selector = screen.getByTestId('attach-schema-root-element-typeahead-select-input');
        const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
        expect(input.getAttribute('value')).toEqual('Invoice');
      });

      const removeButton = await screen.findByTestId('attach-schema-file-remove-ShipOrder.xsd');
      act(() => {
        fireEvent.click(removeButton);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('attach-schema-file-item-ShipOrder.xsd')).not.toBeInTheDocument();
        expect(screen.getByTestId('attach-schema-file-item-MultipleElements.xsd')).toBeInTheDocument();
      });

      await waitFor(() => {
        const selector = screen.getByTestId('attach-schema-root-element-typeahead-select-input');
        const input = getByLabelText(selector, 'Attach schema / Choose Root Element');
        expect(input.getAttribute('value')).toEqual('Invoice');
      });
    });
  });

  describe('File Management', () => {
    it('should remove a single file from the list', async () => {
      mockReadFileAsString.mockResolvedValueOnce(multiIncludeMainXsd).mockResolvedValueOnce(multiIncludeComponentAXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([multiIncludeMainXsd])], 'MultiIncludeMain.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([multiIncludeComponentAXsd])], 'MultiIncludeComponentA.xsd', {
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
      mockReadFileAsString.mockResolvedValue(shipOrderXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Target"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

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
      mockReadFileAsString.mockResolvedValueOnce(shipOrderXsd).mockResolvedValueOnce(shipOrderJsonSchema);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Target"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const xsdFile = new File([new Blob([shipOrderXsd])], 'ShipOrder.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => xsdFile, length: 1, 0: xsdFile } } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('attach-schema-file-item-ShipOrder.xsd')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(importButton);
      });

      const jsonFile = new File([new Blob([shipOrderJsonSchema])], 'ShipOrder.json', { type: 'text/plain' });
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
      mockReadFileAsString.mockResolvedValue(multiIncludeMainXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const fileContent = new File([new Blob([multiIncludeMainXsd])], 'MultiIncludeMain.xsd', { type: 'text/plain' });
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
      mockReadFileAsString.mockResolvedValue(shipOrderXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

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
      mockReadFileAsString.mockResolvedValueOnce(multiIncludeMainXsd).mockResolvedValueOnce(multiIncludeComponentAXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const importButton = await screen.findByTestId('attach-schema-modal-btn-file');
      act(() => {
        fireEvent.click(importButton);
      });

      const fileInput = await screen.findByTestId('attach-schema-file-input');
      const file1 = new File([new Blob([multiIncludeMainXsd])], 'MultiIncludeMain.xsd', { type: 'text/plain' });
      const file2 = new File([new Blob([multiIncludeComponentAXsd])], 'MultiIncludeComponentA.xsd', {
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
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
                actionName="Attach"
                documentTypeLabel="Source"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const commitButton = (await screen.findByTestId('attach-schema-modal-btn-attach')) as HTMLInputElement;
      expect(commitButton.disabled).toEqual(true);
    });

    it('should show parameter document type label', async () => {
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaModal
                isModalOpen={true}
                onModalClose={jest.fn()}
                documentType={DocumentType.PARAM}
                documentId="myParam"
                documentReferenceId="myParam"
                actionName="Attach"
                documentTypeLabel="Parameter: myParam"
              />
            </DataMapperCanvasProvider>
          </DataMapperProvider>
        </BrowserFilePickerMetadataProvider>,
      );

      const modal = screen.queryByTestId('attach-schema-modal');
      expect(modal).toBeInTheDocument();
      expect(modal!.textContent).toContain('Parameter: myParam');
    });
  });
});
