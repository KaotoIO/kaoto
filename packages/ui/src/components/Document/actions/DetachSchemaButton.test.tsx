import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentType, IDocument, PrimitiveDocument } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DocumentService } from '../../../services/document.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { DetachSchemaButton } from './DetachSchemaButton';

describe('DetachSchemaButton', () => {
  it('should detach the schema', async () => {
    let sourceDoc: IDocument;
    let setInitialDoc = true;
    const DetachTest: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { sourceBodyDocument, setSourceBodyDocument } = useDataMapper();
      useEffect(() => {
        if (setInitialDoc) {
          setSourceBodyDocument(TestUtil.createSourceOrderDoc());
          setInitialDoc = false;
        }
      });
      useEffect(() => {
        sourceDoc = sourceBodyDocument;
      }, [sourceBodyDocument]);
      return <div data-testid="detachtest">{children}</div>;
    };
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTest>
            <DetachSchemaButton
              documentId={BODY_DOCUMENT_ID}
              documentType={DocumentType.SOURCE_BODY}
              documentReferenceId="ShipOrder.xsd"
            />
          </DetachTest>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    const detachBtn = await screen.findByTestId('detach-schema-sourceBody-Body-button');
    expect(sourceDoc!.fields.length).toBe(1);
    act(() => {
      fireEvent.click(detachBtn);
    });
    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    await screen.findByTestId('detachtest');
    expect(sourceDoc!.fields.length).toBe(0);
    expect(sourceDoc! instanceof PrimitiveDocument);
  });

  it('should open and close modal', async () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachSchemaButton
            documentId={BODY_DOCUMENT_ID}
            documentType={DocumentType.SOURCE_BODY}
            documentReferenceId="test"
          />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    let modal = screen.queryByTestId('detach-schema-modal');
    expect(modal).not.toBeInTheDocument();

    const detachBtn = await screen.findByTestId('detach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    modal = screen.queryByTestId('detach-schema-modal');
    expect(modal).toBeInTheDocument();

    const cancelBtn = screen.getByTestId('detach-schema-modal-cancel-btn');
    act(() => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByTestId('detach-schema-modal')).not.toBeInTheDocument();
  });

  it('should handle detach with parameter document type', async () => {
    const mockSendAlert = jest.fn();
    const mockUpdateDocument = jest.fn();

    const DetachTestParam: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const dataMapper = useDataMapper();
      dataMapper.sendAlert = mockSendAlert;
      dataMapper.updateDocument = mockUpdateDocument;
      return <div data-testid="detachtest-param">{children}</div>;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTestParam>
            <DetachSchemaButton
              documentId="testParam"
              documentType={DocumentType.PARAM}
              documentReferenceId="testParam"
            />
          </DetachTestParam>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const detachBtn = await screen.findByTestId('detach-schema-param-testParam-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(mockUpdateDocument).toHaveBeenCalledTimes(1);
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it('should handle detach with target body document type', async () => {
    const mockSendAlert = jest.fn();
    const mockUpdateDocument = jest.fn();

    const DetachTestTarget: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const dataMapper = useDataMapper();
      dataMapper.sendAlert = mockSendAlert;
      dataMapper.updateDocument = mockUpdateDocument;
      return <div data-testid="detachtest-target">{children}</div>;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTestTarget>
            <DetachSchemaButton
              documentId={BODY_DOCUMENT_ID}
              documentType={DocumentType.TARGET_BODY}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DetachTestTarget>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const detachBtn = await screen.findByTestId('detach-schema-targetBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(mockUpdateDocument).toHaveBeenCalledTimes(1);
    expect(mockSendAlert).not.toHaveBeenCalled();
  });

  it('should handle error when document creation fails', async () => {
    // Mock DocumentService to simulate failure
    const mockCreatePrimitiveDocument = jest.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'error',
      errors: [{ message: 'Failed to create primitive document' }],
    });

    const mockSendAlert = jest.fn();

    const DetachTestError: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const dataMapper = useDataMapper();
      dataMapper.sendAlert = mockSendAlert;
      return <div data-testid="detachtest-error">{children}</div>;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTestError>
            <DetachSchemaButton
              documentId={BODY_DOCUMENT_ID}
              documentType={DocumentType.SOURCE_BODY}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DetachTestError>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const detachBtn = await screen.findByTestId('detach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'danger',
      title: 'Failed to create primitive document',
    });

    mockCreatePrimitiveDocument.mockRestore();
  });

  it('should handle warning when document creation returns warning', async () => {
    // Mock DocumentService to simulate warning
    const mockCreatePrimitiveDocument = jest.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'warning',
      warnings: [{ message: 'Warning during document creation' }],
    });

    const mockSendAlert = jest.fn();

    const DetachTestWarning: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const dataMapper = useDataMapper();
      dataMapper.sendAlert = mockSendAlert;
      return <div data-testid="detachtest-warning">{children}</div>;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTestWarning>
            <DetachSchemaButton
              documentId={BODY_DOCUMENT_ID}
              documentType={DocumentType.SOURCE_BODY}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DetachTestWarning>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const detachBtn = await screen.findByTestId('detach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'warning',
      title: 'Warning during document creation',
    });

    mockCreatePrimitiveDocument.mockRestore();
  });

  it('should handle case when document or documentDefinition is missing', async () => {
    // Mock DocumentService to return success but with missing document/documentDefinition
    const mockCreatePrimitiveDocument = jest.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'success',
      document: undefined,
      documentDefinition: undefined,
    });

    const mockSendAlert = jest.fn();

    const DetachTestMissing: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const dataMapper = useDataMapper();
      dataMapper.sendAlert = mockSendAlert;
      return <div data-testid="detachtest-missing">{children}</div>;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DetachTestMissing>
            <DetachSchemaButton
              documentId={BODY_DOCUMENT_ID}
              documentType={DocumentType.SOURCE_BODY}
              documentReferenceId={BODY_DOCUMENT_ID}
            />
          </DetachTestMissing>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const detachBtn = await screen.findByTestId('detach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });

    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'danger',
      title: 'Could not detach schema',
    });

    mockCreatePrimitiveDocument.mockRestore();
  });
});
