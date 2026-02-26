import { render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { MappingNodeData, TargetDocumentNodeData, TargetFieldNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

// Mock FieldTypeOverride - the dedicated component that handles save/remove logic
jest.mock('./FieldTypeOverride', () => ({
  FieldTypeOverride: jest.fn(({ isOpen, field, onComplete, onClose }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="field-type-override">
        <span data-testid="field-type-override-field">{field?.name}</span>
        <button data-testid="field-type-override-complete" onClick={onComplete}>
          Mock Complete
        </button>
        <button data-testid="field-type-override-close" onClick={onClose}>
          Mock Close
        </button>
      </div>
    );
  }),
}));

describe('TargetNodeActions', () => {
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const nodeData = new TargetDocumentNodeData(targetDoc, tree);
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <TargetNodeActions nodeData={nodeData} onUpdate={jest.fn()} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-actions-menu-toggle')).toBeTruthy();
  });

  it('should render expression action', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const docData = new TargetDocumentNodeData(targetDoc, tree);
    const mappingData = new MappingNodeData(docData, new ValueSelector(tree));
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <TargetNodeActions nodeData={mappingData} onUpdate={jest.fn()} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-xpath-input')).toBeTruthy();
    expect(screen.getByTestId(`edit-xpath-button-${mappingData.id}`)).toBeTruthy();
  });

  describe('FieldTypeOverride integration', () => {
    it('should render FieldTypeOverride with the correct field', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const parentNode = new TargetDocumentNodeData(targetDoc, tree);
      const field = targetDoc.fields[0];
      const nodeData = new TargetFieldNodeData(parentNode, field);

      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TargetNodeActions nodeData={nodeData} onUpdate={mockOnUpdate} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );

      // FieldTypeOverride should be rendered with the field
      const FieldTypeOverrideMock = jest.requireMock('./FieldTypeOverride').FieldTypeOverride;
      const lastCall = FieldTypeOverrideMock.mock.calls[FieldTypeOverrideMock.mock.calls.length - 1];
      expect(lastCall[0].field).toBe(field);
    });

    it('should pass onUpdate as onComplete to FieldTypeOverride', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const parentNode = new TargetDocumentNodeData(targetDoc, tree);
      const field = targetDoc.fields[0];
      const nodeData = new TargetFieldNodeData(parentNode, field);

      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TargetNodeActions nodeData={nodeData} onUpdate={mockOnUpdate} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );

      const FieldTypeOverrideMock = jest.requireMock('./FieldTypeOverride').FieldTypeOverride;
      const lastCall = FieldTypeOverrideMock.mock.calls[FieldTypeOverrideMock.mock.calls.length - 1];
      const onCompleteCallback = lastCall[0].onComplete;

      // Calling onComplete should trigger onUpdate
      onCompleteCallback();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
