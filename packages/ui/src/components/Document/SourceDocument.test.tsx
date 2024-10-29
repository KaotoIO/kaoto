import { SourceDocument } from './SourceDocument';
import { render, screen, waitFor } from '@testing-library/react';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { BODY_DOCUMENT_ID, PrimitiveDocument } from '../../models/datamapper/document';
import { DocumentType } from '../../models/datamapper/path';
import { TestUtil } from '../../stubs/data-mapper';

describe('SourceDocument', () => {
  it('should render primitive document', async () => {
    const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourceDocument document={document} isReadOnly={false} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByText('Body')).toBeTruthy();
  });

  it('should render ShipOrder doc', async () => {
    const document = TestUtil.createSourceOrderDoc();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourceDocument document={document} isReadOnly={false} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByText('OrderPerson')).toBeTruthy();
    expect(await screen.findByText('Country')).toBeInTheDocument();
  });

  it('should render camel-spring.xsd doc till 2nd level', async () => {
    const document = TestUtil.createCamelSpringXsdSourceDoc();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourceDocument document={document} isReadOnly={false} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    await waitFor(async () => {
      const aggregates = await screen.findAllByText('aggregate');
      expect(aggregates.length).toEqual(2);
    });
    expect(await screen.findByText('correlationExpression')).toBeTruthy();
  }, 10000);
});
