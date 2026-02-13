import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentType } from '../../../../models/datamapper/document';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../../providers/datamapper-canvas.provider';
import { BrowserFilePickerMetadataProvider } from '../../../../stubs/BrowserFilePickerMetadataProvider';
import { AttachSchemaButton } from './AttachSchemaButton';

describe('AttachSchemaButton', () => {
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
});
