import { render, screen } from '@testing-library/react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../../models/datamapper/document';
import { MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

describe('TargetNodeActions', () => {
  it('should not render context menu for schema-attached target document', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const nodeData = new TargetDocumentNodeData(targetDoc, tree);
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={nodeData} onUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('transformation-actions-menu-toggle')).not.toBeInTheDocument();
  });

  it('should render context menu for primitive target document', async () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const tree = new MappingTree(primitiveDoc.documentType, primitiveDoc.documentId, DocumentDefinitionType.Primitive);
    const nodeData = new TargetDocumentNodeData(primitiveDoc, tree);
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={nodeData} onUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-actions-menu-toggle')).toBeTruthy();
  });

  it('should render expression action', async () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const tree = new MappingTree(primitiveDoc.documentType, primitiveDoc.documentId, DocumentDefinitionType.Primitive);
    const docData = new TargetDocumentNodeData(primitiveDoc, tree);
    const mappingData = new MappingNodeData(docData, new ValueOfSelector(tree));
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={mappingData} onUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-xpath-input')).toBeInTheDocument();
    expect(screen.getByTestId(`edit-xpath-button-${mappingData.id}`)).toBeInTheDocument();
  });
});
