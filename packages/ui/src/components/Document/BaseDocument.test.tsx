import { render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { TreeUIService } from '../../services/tree-ui.service';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentContent, DocumentHeader } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';

describe('DocumentHeader', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <DataMapperCanvasProvider>{children}</DataMapperCanvasProvider>
    </DataMapperProvider>
  );

  it('should render with enableDnD=false (default)', () => {
    const document = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);

    render(
      <DocumentHeader
        header={<div>Test Header</div>}
        document={document}
        documentType={DocumentType.TARGET_BODY}
        isReadOnly={false}
      />,
      { wrapper },
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    // Should not have drag handler when enableDnD is false
    expect(screen.queryByTestId('drag-handler')).not.toBeInTheDocument();
  });

  it('should render with enableDnD=true', () => {
    const document = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);

    const { container } = render(
      <DocumentHeader
        header={<div>Test Header</div>}
        document={document}
        documentType={DocumentType.TARGET_BODY}
        isReadOnly={false}
        enableDnD={true}
      />,
      { wrapper },
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    // Should have drag handler when enableDnD is true
    const dragHandler = container.querySelector('[data-drag-handler]');
    expect(dragHandler).toBeInTheDocument();
  });

  it('should render attach/detach schema buttons when not read-only', () => {
    const document = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);

    render(
      <DocumentHeader
        header={<div>Test Header</div>}
        document={document}
        documentType={DocumentType.TARGET_BODY}
        isReadOnly={false}
      />,
      { wrapper },
    );

    expect(screen.getByTestId(`attach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
    expect(screen.getByTestId(`detach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
  });
});

describe('DocumentContent', () => {
  it('should render child nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(document.documentType, document.documentId, document.definitionType);
    const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
    const tree = TreeUIService.createTree(documentNodeData);

    const { container } = render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DocumentContent
            treeNode={tree.root}
            isReadOnly={false}
            renderNodes={(childNode) => (
              <TargetDocumentNode treeNode={childNode} documentId={documentNodeData.id} rank={1} />
            )}
          />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Should render child nodes
    const nodes = container.querySelectorAll('[data-testid^="node-target-"]');
    expect(nodes.length).toBeGreaterThan(0);
  });
});
