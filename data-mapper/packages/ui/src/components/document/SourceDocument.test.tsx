import { SourceDocument } from './SourceDocument';
import { render, screen } from '@testing-library/react';
import { TestUtil } from '../../test/test-util';
import { DataMapperProvider } from '../../providers';
import { CanvasProvider } from '../../providers/CanvasProvider';
import { BODY_DOCUMENT_ID, PrimitiveDocument } from '../../models/document';
import { DocumentType } from '../../models/path';

describe('SourceDocument', () => {
  it('should render primitive document', () => {
    const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <SourceDocument document={document} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('should render ShipOrder doc', () => {
    const document = TestUtil.createSourceOrderDoc();
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <SourceDocument document={document} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByText('OrderPerson')).toBeTruthy();
  });
});
