import { render } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { QName } from '../../../../xml-schema-ts/QName';
import { FieldTypeOverride, revertTypeOverride } from './FieldTypeOverride';

// Mock TypeOverrideModal to expose the onSave/onAttach/onRemove callbacks
jest.mock('./TypeOverrideModal', () => ({
  TypeOverrideModal: jest.fn(({ isOpen, onSave, onAttach, onRemove }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="type-override-modal">
        <button data-testid="mock-save" onClick={() => onSave(mockSelectedType)}>
          Save
        </button>
        <button data-testid="mock-attach" onClick={() => onAttach({ 'custom.xsd': '<xs:schema/>' })}>
          Attach
        </button>
        <button data-testid="mock-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  }),
}));

// Mock FieldTypeOverrideService
jest.mock('../../../../services/field-type-override.service', () => ({
  FieldTypeOverrideService: {
    applyFieldTypeOverride: jest.fn(),
    revertFieldTypeOverride: jest.fn(),
    addSchemaFilesForTypeOverride: jest.fn(),
  },
}));

// Mock useDataMapper hook
jest.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

const mockSelectedType: IFieldTypeInfo = {
  typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
  displayName: 'int',
  type: Types.Integer,
  isBuiltIn: true,
};

describe('FieldTypeOverride', () => {
  let testTargetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let testMappingTree: MappingTree;
  const mockUpdateDocument = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    testTargetDoc = TestUtil.createTargetOrderDoc();
    testMappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    jest.clearAllMocks();
    const { useDataMapper } = jest.requireMock('../../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: mockUpdateDocument,
    });
  });

  it('should pass field to TypeOverrideModal when open', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    expect(lastCall[0].field).toBe(field);
  });

  it('should not render TypeOverrideModal when closed', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={false} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    expect(TypeOverrideModalMock).not.toHaveBeenCalled();
  });

  it('should call applyFieldTypeOverride and updateDocument on save', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback(mockSelectedType);

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

  it('should not call addSchemaFilesForTypeOverride on save', () => {
    const field = testTargetDoc.fields[0];

    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback(mockSelectedType);

    expect(FieldTypeOverrideService.addSchemaFilesForTypeOverride).not.toHaveBeenCalled();
    expect(FieldTypeOverrideService.applyFieldTypeOverride).toHaveBeenCalled();
  });

  it('should call addSchemaFilesForTypeOverride and updateDocument on attach', () => {
    const field = testTargetDoc.fields[0];
    const schemas = { 'custom.xsd': '<xs:schema/>' };

    render(<FieldTypeOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const TypeOverrideModalMock = jest.requireMock('./TypeOverrideModal').TypeOverrideModal;
    const lastCall = TypeOverrideModalMock.mock.calls[TypeOverrideModalMock.mock.calls.length - 1];
    const onAttachCallback = lastCall[0].onAttach;

    onAttachCallback(schemas);

    expect(FieldTypeOverrideService.addSchemaFilesForTypeOverride).toHaveBeenCalledWith(field.ownerDocument, schemas);
    expect(mockUpdateDocument).toHaveBeenCalled();
    // Attach should not trigger onComplete or onClose
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
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
