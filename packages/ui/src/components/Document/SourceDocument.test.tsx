import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../../models/datamapper/document';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { SourceDocument } from './SourceDocument';
import { ParameterDocument } from './ParameterDocument';

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

  it('should render parameter renaming wizard for document', async () => {
    const document = new PrimitiveDocument(DocumentType.PARAM, 'param1');
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ParameterDocument document={document} isReadOnly={false} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByText('param1')).toBeTruthy();
    const renameButton = screen.getByTestId('rename-parameter-param1-button');
    act(() => {
      fireEvent.click(renameButton);
    });
    expect(await screen.findByTestId('new-parameter-name-input')).toBeTruthy();
    expect(await screen.findByTestId('new-parameter-submit-btn')).toBeTruthy();
    expect(await screen.findByTestId('new-parameter-cancel-btn')).toBeTruthy();
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
