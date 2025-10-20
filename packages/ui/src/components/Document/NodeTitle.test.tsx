import { render, screen } from '@testing-library/react';
import { NodeTitle } from './NodeTitle';
import { DocumentNodeData, FieldNodeData } from '../../models/datamapper/visualization';
import { DocumentType, PrimitiveDocument, BODY_DOCUMENT_ID } from '../../models/datamapper/document';
import { TestUtil } from '../../stubs/datamapper/data-mapper';

describe('NodeTitle', () => {
  const createMockField = () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    return shipOrderDoc.fields[0]; // Use a real field from test data
  };

  it('should render document title with Title component when isDocument is true', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: BODY_DOCUMENT_ID }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={true} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Body');
  });

  it('should render field title with Truncate when isDocument is false', () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const mockField = createMockField();
    const fieldNodeData = new FieldNodeData(documentNodeData, mockField);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    expect(screen.getByText(mockField.displayName)).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should render with truncate class by default for document node', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: BODY_DOCUMENT_ID }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });

  it('should render content correctly with custom className', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    const customClass = 'custom-test-class';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: BODY_DOCUMENT_ID }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={true} className={customClass} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Body');
  });

  it('should handle PrimitiveDocument node data', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, 'primitive-doc');
    const primitiveNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: 'primitive-doc' }] as any[];
    const fieldNodeData = new FieldNodeData(primitiveNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={true} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('primitive-doc');
  });

  it('should handle long titles with truncation', () => {
    const longTitle = 'This is a very long document title that should be truncated properly when rendered';
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, longTitle);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: longTitle }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={true} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent(longTitle);
  });

  it('should render with truncate class by default', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: BODY_DOCUMENT_ID }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });

  it('should handle undefined className gracefully', () => {
    const primitiveDoc = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primitiveDoc.fields = [{ displayName: BODY_DOCUMENT_ID }] as any[];
    const fieldNodeData = new FieldNodeData(documentNodeData, primitiveDoc.fields[0]);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} className={undefined} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });
});
