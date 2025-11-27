import { render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../../models/datamapper/document';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { SourceDocument } from './SourceDocument';

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

  it('should render camel-spring.xsd doc till 3rd level', async () => {
    const document = TestUtil.createCamelSpringXsdSourceDoc();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourceDocument document={document} isReadOnly={false} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    await waitFor(async () => {
      const aggregate = await screen.findByText('aggregate', { selector: '[data-rank="1"]' });
      expect(aggregate).toBeInTheDocument();
    });

    await waitFor(async () => {
      const correlationExpression = await screen.findByText('correlationExpression', { selector: '[data-rank="2"]' });
      expect(correlationExpression).toBeInTheDocument();
    });
  }, 60_000);
});
