import { render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

describe('TargetNodeActions', () => {
  it('should render', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const nodeData = new TargetDocumentNodeData(targetDoc, tree);
    render(<TargetNodeActions nodeData={nodeData} onUpdate={jest.fn()} />);
    expect(await screen.findByTestId('transformation-actions-menu-toggle')).toBeTruthy();
  });

  it('should render expression action', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const docData = new TargetDocumentNodeData(targetDoc, tree);
    const mappingData = new MappingNodeData(docData, new ValueSelector(tree));
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={mappingData} onUpdate={jest.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-xpath-input')).toBeTruthy();
    expect(screen.getByTestId(`edit-xpath-button-${mappingData.id}`)).toBeTruthy();
  });
});
