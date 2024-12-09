import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DetachSchemaButton } from './DetachSchemaButton';
import { BODY_DOCUMENT_ID, IDocument, PrimitiveDocument } from '../../../models/datamapper/document';
import { DocumentType } from '../../../models/datamapper/path';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useDataMapper } from '../../../hooks/useDataMapper';

import { TestUtil } from '../../../stubs/data-mapper';

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
            <DetachSchemaButton documentId={BODY_DOCUMENT_ID} documentType={DocumentType.SOURCE_BODY} />
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
});
