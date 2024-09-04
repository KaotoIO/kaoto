import { TargetNodeActions } from './TargetNodeActions';
import { render, screen } from '@testing-library/react';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { DocumentType } from '../../../models/datamapper/path';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { TestUtil } from '../../../stubs/data-mapper';

describe('TargetNodeActions', () => {
  it('should render', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const nodeData = new TargetDocumentNodeData(targetDoc, tree);
    render(<TargetNodeActions nodeData={nodeData} onUpdate={jest.fn()} />);
    expect(await screen.findByTestId('transformation-actions-menu-toggle')).toBeTruthy();
  });

  it('should render expression action', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const docData = new TargetDocumentNodeData(targetDoc, tree);
    const mappingData = new MappingNodeData(docData, new ValueSelector(tree));
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <TargetNodeActions nodeData={mappingData} onUpdate={jest.fn()} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-expression-input')).toBeTruthy();
    expect(screen.getByTestId(`edit-expression-button-${mappingData.id}`)).toBeTruthy();
  });
});
