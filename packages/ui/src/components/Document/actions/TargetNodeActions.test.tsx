import { render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../models/datamapper/types';
import { MappingNodeData, TargetDocumentNodeData, TargetFieldNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

// Mock TypeOverrideModal
jest.mock('./TypeOverrideModal', () => ({
  TypeOverrideModal: jest.fn(({ isOpen, onSave, onRemove }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="type-override-modal">
        <button onClick={() => onSave({ typeString: 'xs:string', type: Types.String })}>Mock Save</button>
        <button onClick={onRemove}>Mock Remove</button>
      </div>
    );
  }),
}));

// Mock FieldTypeOverrideService
jest.mock('../../../services/field-type-override.service', () => ({
  FieldTypeOverrideService: {
    applyFieldTypeOverride: jest.fn(),
    revertFieldTypeOverride: jest.fn(),
  },
}));

// Mock useDataMapper hook
jest.mock('../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

describe('TargetNodeActions', () => {
  const mockUpdateDocument = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useDataMapper } = jest.requireMock('../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA),
      updateDocument: mockUpdateDocument,
    });
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

  describe('Type Override handlers', () => {
    it('should call FieldTypeOverrideService.applyFieldTypeOverride when saving type override', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const parentNode = new TargetDocumentNodeData(targetDoc, tree);
      const field = targetDoc.fields[0];
      const nodeData = new TargetFieldNodeData(parentNode, field);

      const mockSelectedType: IFieldTypeInfo = {
        typeString: 'xs:int',
        displayName: 'int',
        type: Types.Integer,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      };

      // Render component - TypeOverrideModal is mocked
      render(<TargetNodeActions nodeData={nodeData} onUpdate={mockOnUpdate} />);

      // Get the mocked TypeOverrideModal's onSave callback
      const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
      const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
      const onSaveCallback = lastCall[0].onSave;

      // Call the onSave callback directly
      onSaveCallback(mockSelectedType);

      // Verify service was called
      expect(FieldTypeOverrideService.applyFieldTypeOverride).toHaveBeenCalledWith(
        field.ownerDocument,
        field,
        mockSelectedType,
        tree.namespaceMap,
        TypeOverrideVariant.SAFE,
      );
      expect(mockUpdateDocument).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it('should call FieldTypeOverrideService.revertFieldTypeOverride when removing type override', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const parentNode = new TargetDocumentNodeData(targetDoc, tree);
      const field = targetDoc.fields[0];
      const nodeData = new TargetFieldNodeData(parentNode, field);

      // Render component - TypeOverrideModal is mocked
      render(<TargetNodeActions nodeData={nodeData} onUpdate={mockOnUpdate} />);

      // Get the mocked TypeOverrideModal's onRemove callback
      const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
      const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
      const onRemoveCallback = lastCall[0].onRemove;

      // Call the onRemove callback directly
      onRemoveCallback();

      // Verify service was called
      expect(FieldTypeOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(
        field.ownerDocument,
        field,
        tree.namespaceMap,
      );
      expect(mockUpdateDocument).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
