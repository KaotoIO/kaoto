import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataMapperProvider } from '../../../providers';
import { CanvasProvider } from '../../../providers/CanvasProvider';
import { DetachSchemaButton } from './DetachSchemaButton';
import { BODY_DOCUMENT_ID, IDocument, PrimitiveDocument } from '../../../models/document';
import { DocumentType } from '../../../models/path';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useDataMapper } from '../../../hooks';
import { TestUtil } from '../../../test/test-util';

describe('DetachSchemaButton', () => {
  it('should detach the schema', () => {
    let sourceDoc: IDocument;
    const DetachTest: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { sourceBodyDocument, setSourceBodyDocument } = useDataMapper();
      useEffect(() => {
        setSourceBodyDocument(TestUtil.createSourceOrderDoc());
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        sourceDoc = sourceBodyDocument;
      }, [sourceBodyDocument]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <DetachTest>
            <DetachSchemaButton documentId={BODY_DOCUMENT_ID} documentType={DocumentType.SOURCE_BODY} />
          </DetachTest>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(sourceDoc!.fields.length).toBe(1);
    const detachBtn = screen.getByTestId('detach-schema-sourceBody-Body-button');
    act(() => {
      fireEvent.click(detachBtn);
    });
    const confirmBtn = screen.getByTestId('detach-schema-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    expect(sourceDoc!.fields.length).toBe(0);
    expect(sourceDoc! instanceof PrimitiveDocument);
  });
});
