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

import { useDataMapper } from '../../../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DocumentService } from '../../../services/document.service';
import { BrowserFilePickerMetadataProvider } from '../../../stubs/BrowserFilePickerMetadataProvider';
import {
  multipleElementsXsd,
  noTopElementXsd,
  shipOrderEmptyFirstLineXsd,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
  shipOrderXsd,
} from '../../../stubs/datamapper/data-mapper';
import { readFileAsString } from '../../../stubs/read-file-as-string';
import { AttachSchemaButton } from './AttachSchemaButton';

jest.mock('../../../stubs/read-file-as-string');
const mockReadFileAsString = readFileAsString as jest.MockedFunction<typeof readFileAsString>;

describe('AttachSchemaButton', () => {
  afterAll(() => {
    mockReadFileAsString.mockReset();
  });

  it('should open attach schema modal when no schema is attached', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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

  it('should open update schema warning modal when schema is already attached', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              hasSchema={true}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });

    const attachSchemaModal = screen.queryByTestId('attach-schema-modal');
    expect(attachSchemaModal).toBeNull();

    await waitFor(() => {
      const warningModal = screen.queryByTestId('update-schema-warning-modal');
      expect(warningModal).toBeInTheDocument();
    });
  });

  it('should cancel schema update when cancel button is clicked in warning modal', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              hasSchema={true}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });

    let attachSchemaModal = screen.queryByTestId('attach-schema-modal');
    expect(attachSchemaModal).toBeNull();

    await waitFor(() => {
      const warningModal = screen.queryByTestId('update-schema-warning-modal');
      expect(warningModal).toBeInTheDocument();
    });

    const warningModalCancelButton = await screen.findByTestId('update-schema-warning-modal-btn-cancel');
    act(() => {
      fireEvent.click(warningModalCancelButton);
    });

    await waitFor(() => {
      const warningModal = screen.queryByTestId('update-schema-warning-modal');
      expect(warningModal).toBeNull();
    });

    attachSchemaModal = screen.queryByTestId('attach-schema-modal');
    expect(attachSchemaModal).toBeNull();
  });

  it('should open attach schema modal when continue button is clicked in warning modal', async () => {
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              hasSchema={true}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </BrowserFilePickerMetadataProvider>,
    );

    const attachButton = await screen.findByTestId('attach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(attachButton);
    });

    const attachSchemaModal = screen.queryByTestId('attach-schema-modal');
    expect(attachSchemaModal).toBeNull();

    await waitFor(() => {
      const warningModal = screen.queryByTestId('update-schema-warning-modal');
      expect(warningModal).toBeInTheDocument();
    });

    const warningModalContinueButton = await screen.findByTestId('update-schema-warning-modal-btn-continue');
    act(() => {
      fireEvent.click(warningModalContinueButton);
    });

    await waitFor(() => {
      const attachSchemaModal = screen.queryByTestId('attach-schema-modal');
      expect(attachSchemaModal).toBeInTheDocument();
    });

    const warningModal = screen.queryByTestId('update-schema-warning-modal');
    expect(warningModal).toBeNull();
  });

  it('should import XML schema', async () => {
    mockReadFileAsString.mockResolvedValue(shipOrderXsd);
    render(
      <BrowserFilePickerMetadataProvider>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.SOURCE_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={BODY_DOCUMENT_ID}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
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

  describe('Root Element Selection', () => {
    it('should show root element selector when multiple elements are available', async () => {
      mockReadFileAsString.mockResolvedValue(multipleElementsXsd);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaButton
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
              />
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
      const fileContent = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('MultipleElements.xsd');
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
              <AttachSchemaButton
                documentType={DocumentType.SOURCE_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
              />
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
              <AttachSchemaButton
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
              />
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
      const fileContent = new File([new Blob([multipleElementsXsd])], 'MultipleElements.xsd', { type: 'text/plain' });
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });

      await waitFor(() => {
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('MultipleElements.xsd');
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
          <AttachSchemaButton
            documentType={DocumentType.TARGET_BODY}
            documentId={BODY_DOCUMENT_ID}
            documentReferenceId={BODY_DOCUMENT_ID}
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

      const attachButton = await screen.findByTestId('attach-schema-targetBody-Body-button');
      act(() => {
        fireEvent.click(attachButton);
      });

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
        const text: HTMLInputElement = screen.getByTestId('attach-schema-modal-text');
        expect(text.value).toEqual('MultipleElements.xsd');
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
        const modal = screen.queryByTestId('attach-schema-modal');
        expect(modal).not.toBeInTheDocument();
      });

      const rootElementQName = DocumentService.getRootElementQName(dataMapperContext!.targetBodyDocument);
      expect(rootElementQName).toBeDefined();
      expect(rootElementQName?.getLocalPart()).toEqual('Invoice');
      expect(rootElementQName?.getNamespaceURI()).toEqual('io.kaoto.datamapper.test.multiple');
    });

    it('should not show root element selector for JSON schemas', async () => {
      mockReadFileAsString.mockResolvedValue(shipOrderJsonSchema);
      render(
        <BrowserFilePickerMetadataProvider>
          <DataMapperProvider>
            <DataMapperCanvasProvider>
              <AttachSchemaButton
                documentType={DocumentType.TARGET_BODY}
                documentId={BODY_DOCUMENT_ID}
                documentReferenceId={BODY_DOCUMENT_ID}
              />
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

      const rootElementSelector = screen.queryByTestId('attach-schema-root-element-typeahead-select-input');
      expect(rootElementSelector).not.toBeInTheDocument();
    });
  });
});
