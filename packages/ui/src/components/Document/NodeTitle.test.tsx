import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { IfItem, MappingTree } from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { NodeTitle } from './NodeTitle';

describe('NodeTitle', () => {
  const createMockField = () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    return shipOrderDoc.fields[0];
  };

  it('should render document title with Title component when isDocument is true', () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={documentNodeData} isDocument={true} rank={0} />);

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
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={documentNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });

  it('should render content correctly with custom className', () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);
    const customClass = 'custom-test-class';

    render(<NodeTitle nodeData={documentNodeData} isDocument={true} className={customClass} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('Body');
  });

  it('should handle PrimitiveDocument node data', () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'primitive-doc'),
    );
    const primitiveNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={primitiveNodeData} isDocument={true} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent('primitive-doc');
  });

  it('should handle long titles with truncation', () => {
    const longTitle = 'This is a very long document title that should be truncated properly when rendered';
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, longTitle),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={documentNodeData} isDocument={true} rank={0} />);

    const titleElement = screen.getByRole('heading', { level: 5 });
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveTextContent(longTitle);
  });

  it('should render with truncate class by default', () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={documentNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });

  it('should handle undefined className gracefully', () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(primitiveDoc);

    render(<NodeTitle nodeData={documentNodeData} isDocument={false} className={undefined} rank={0} />);

    const element = screen.getByText('Body');
    expect(element).toHaveClass('node-title__text');
  });

  it('should display minOccurs and maxOccurs in popover for FieldNodeData on hover', async () => {
    const user = userEvent.setup();
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const mockField = createMockField();
    const fieldNodeData = new FieldNodeData(documentNodeData, mockField);

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    const fieldElement = screen.getByText(mockField.displayName);
    await user.hover(fieldElement);

    await waitFor(() => {
      expect(screen.getByText(/minOccurs/)).toBeInTheDocument();
      expect(screen.getByText(/maxOccurs/)).toBeInTheDocument();
    });
  });

  it('should display an asterisk when the field information is required', async () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const mockField = createMockField();
    const fieldNodeData = new FieldNodeData(documentNodeData, mockField);
    fieldNodeData.field.minOccurs = 1;

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('*');
    expect(element).toBeVisible();
  });

  it('should not display an asterisk when the field information is optional', async () => {
    const shipOrderDoc = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(shipOrderDoc);
    const mockField = createMockField();
    const fieldNodeData = new FieldNodeData(documentNodeData, mockField);
    fieldNodeData.field.minOccurs = 0;

    render(<NodeTitle nodeData={fieldNodeData} isDocument={false} rank={0} />);

    const element = screen.queryByText('*');
    expect(element).not.toBeInTheDocument();
  });

  it('should not display popover for MappingNodeData', async () => {
    const user = userEvent.setup();
    const targetDoc = TestUtil.createTargetOrderDoc();
    const targetDocNodeData = new TargetDocumentNodeData(
      targetDoc,
      new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA),
    );
    const mockMapping = { id: 'test-mapping', name: 'if' };
    const mappingNodeData = new MappingNodeData(targetDocNodeData, mockMapping as IfItem);

    render(<NodeTitle nodeData={mappingNodeData} isDocument={false} rank={0} />);

    const element = screen.getByText('if');
    await user.hover(element);

    await waitFor(
      () => {
        expect(screen.queryByText(/minOccurs/)).not.toBeInTheDocument();
        expect(screen.queryByText(/maxOccurs/)).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });
});
