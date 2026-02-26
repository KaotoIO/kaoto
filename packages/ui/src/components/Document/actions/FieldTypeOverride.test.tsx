import { render } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { FieldTypeOverride, revertTypeOverride } from './FieldTypeOverride';

// Mock TypeOverrideModal to expose the onSave/onRemove callbacks
jest.mock('./TypeOverrideModal', () => ({
  TypeOverrideModal: jest.fn(({ isOpen, onSave, onRemove }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="type-override-modal">
        <button data-testid="mock-save" onClick={() => onSave(mockSelectedType, TypeOverrideVariant.SAFE)}>
          Save
        </button>
        <button data-testid="mock-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  }),
}));

// Mock FieldTypeOverrideService
jest.mock('../../../services/field-type-override.service', () => ({
  FieldTypeOverrideService: {
    applyFieldTypeOverride: jest.fn(),
    revertFieldTypeOverride: jest.fn(),
    addSchemaFilesForTypeOverride: jest.fn().mockReturnValue({}),
  },
}));

// Mock useDataMapper hook
jest.mock('../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

const mockSelectedType: IFieldTypeInfo = {
  typeString: 'xs:int',
  displayName: 'int',
  type: Types.Integer,
  namespaceURI: 'http://www.w3.org/2001/XMLSchema',
  isBuiltIn: true,
};

describe('FieldTypeOverride', () => {
  const testTargetDoc = TestUtil.createTargetOrderDoc();
  const testMappingTree = new MappingTree(
    DocumentType.TARGET_BODY,
    BODY_DOCUMENT_ID,
    DocumentDefinitionType.XML_SCHEMA,
  );
  const mockUpdateDocument = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useDataMapper } = jest.requireMock('../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: mockUpdateDocument,
    });
  });

  it('should pass field and isOpen to TypeOverrideModal', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    expect(lastCall[0].isOpen).toBe(true);
    expect(lastCall[0].field).toBe(field);
  });

  it('should call applyFieldTypeOverride and updateDocument on save', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    // Get the onSave callback passed to TypeOverrideModal
    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback(mockSelectedType, TypeOverrideVariant.SAFE);

    expect(FieldTypeOverrideService.applyFieldTypeOverride).toHaveBeenCalledWith(
      field.ownerDocument,
      field,
      mockSelectedType,
      testMappingTree.namespaceMap,
      TypeOverrideVariant.SAFE,
    );
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call addSchemaFilesForTypeOverride when supplementary schemas are provided', () => {
    const field = testTargetDoc.fields[0];
    const supplementarySchemas = { 'custom.xsd': '<xs:schema/>' };

    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback(mockSelectedType, TypeOverrideVariant.SAFE, supplementarySchemas);

    expect(FieldTypeOverrideService.addSchemaFilesForTypeOverride).toHaveBeenCalledWith(
      field.ownerDocument,
      supplementarySchemas,
    );
    expect(FieldTypeOverrideService.applyFieldTypeOverride).toHaveBeenCalled();
    expect(mockUpdateDocument).toHaveBeenCalled();
  });

  it('should not call addSchemaFilesForTypeOverride when supplementary schemas are empty', () => {
    const field = testTargetDoc.fields[0];

    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback(mockSelectedType, TypeOverrideVariant.SAFE, {});

    expect(FieldTypeOverrideService.addSchemaFilesForTypeOverride).not.toHaveBeenCalled();
    expect(FieldTypeOverrideService.applyFieldTypeOverride).toHaveBeenCalled();
  });

  it('should call revertFieldTypeOverride and updateDocument on remove', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onRemoveCallback = lastCall[0].onRemove;

    onRemoveCallback();

    expect(FieldTypeOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(
      field.ownerDocument,
      field,
      testMappingTree.namespaceMap,
    );
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should pass onClose to TypeOverrideModal', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onCloseCallback = lastCall[0].onClose;

    onCloseCallback();

    expect(mockOnClose).toHaveBeenCalled();
    // onClose without save/remove should not trigger onComplete
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});

describe('revertTypeOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call revertFieldTypeOverride and updateDocument', () => {
    const testTargetDoc = TestUtil.createTargetOrderDoc();
    const field = testTargetDoc.fields[0];
    const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };
    const mockUpdateDocument = jest.fn();

    revertTypeOverride(field, namespaceMap, mockUpdateDocument);

    expect(FieldTypeOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(
      field.ownerDocument,
      field,
      namespaceMap,
    );
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      field.ownerDocument,
      field.ownerDocument.definition,
      expect.any(String),
    );
  });
});
