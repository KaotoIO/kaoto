import { fireEvent, render, screen } from '@testing-library/react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentContent, DocumentHeader } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';

describe('DocumentHeader', () => {
  afterEach(() => {
    useDocumentTreeStore.getState().clearSelection();
  });

  it('should render with enableDnD=false (default)', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.queryByTestId('drag-handler')).not.toBeInTheDocument();
  });

  it('should render with enableDnD=true', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    const { container } = render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
          enableDnD
        />
      </DataMapperProvider>,
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    const dragHandler = container.querySelector('[data-drag-handler]');
    expect(dragHandler).toBeInTheDocument();
  });

  it('should render attach/detach schema buttons when not read-only', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    expect(screen.getByTestId(`attach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
    expect(screen.getByTestId(`detach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
  });

  it('should update store selection when clicking the header', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    const headerContainer = screen.getByTestId(`document-doc-targetBody-${BODY_DOCUMENT_ID}`);
    fireEvent.click(headerContainer);

    const store = useDocumentTreeStore.getState();
    expect(store.selectedNodePath).toBeTruthy();
  });

  it('should render a connection port span for a primitive document (no schema)', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'p'),
    );

    const { container } = render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Param p</div>}
          document={document}
          documentType={DocumentType.PARAM}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    const port = container.querySelector('[data-connection-port="true"]');
    expect(port).toBeInTheDocument();
    // data-document-id must match DocumentNodeData.getId(document) = "doc-param-p"
    expect(port).toHaveAttribute('data-document-id', 'doc-param-p');
    // data-node-path must match NodePath.fromDocument(DocumentType.PARAM, "p").toString() = "param:p://"
    expect(port).toHaveAttribute('data-node-path', 'param:p://');
  });

  it('should NOT render a connection port span for a document that has a schema', () => {
    const document = TestUtil.createSourceOrderDoc();

    const { container } = render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Source Body</div>}
          document={document}
          documentType={DocumentType.SOURCE_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    // Schema-having documents use BaseNode per field, not a header-level port
    const port = container.querySelector('[data-connection-port="true"]');
    expect(port).not.toBeInTheDocument();
  });
});

describe('DocumentContent', () => {
  it('should render child nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(document.documentType, document.documentId, document.definitionType);
    const documentNodeData = new TargetDocumentNodeData(document, mappingTree);

    const tree: ReturnType<typeof TreeUIService.createTree> = TreeUIService.createTree(documentNodeData);

    const { container } = render(
      <DataMapperProvider>
        <DocumentContent
          treeNode={tree!.root}
          isReadOnly={false}
          renderNodes={(childNode) => (
            <TargetDocumentNode treeNode={childNode} documentId={documentNodeData.id} rank={1} />
          )}
        />
      </DataMapperProvider>,
    );

    const nodes = container.querySelectorAll('[data-testid^="node-target-"]');
    expect(nodes.length).toBeGreaterThan(0);
  });
});
