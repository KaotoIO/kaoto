import { render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
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
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

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
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

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
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

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

  it('should register node reference with accessible containerRef', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    let capturedContainerRef: HTMLDivElement | null = null;

    // Helper component to access canvas context
    const NodeRefChecker: FunctionComponent = () => {
      const { getNodeReference } = useCanvas();
      const [checked, setChecked] = useState(false);

      useEffect(() => {
        if (!checked) {
          const nodeRef = getNodeReference(`targetBody:${BODY_DOCUMENT_ID}://`);
          if (nodeRef?.current) {
            capturedContainerRef = nodeRef.current.containerRef;
            setChecked(true);
          }
        }
      }, [getNodeReference, checked]);

      return null;
    };

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DocumentHeader
            header={<div>Test Header</div>}
            document={document}
            documentType={DocumentType.TARGET_BODY}
            isReadOnly={false}
          />
          <NodeRefChecker />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    expect(capturedContainerRef).toBeInstanceOf(HTMLDivElement);
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
