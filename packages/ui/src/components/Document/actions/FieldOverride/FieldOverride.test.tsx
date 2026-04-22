import { render } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldTypeInfo, Types } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { QName } from '../../../../xml-schema-ts/QName';
import { FieldOverride, revertOverride } from './FieldOverride';

// Mock FieldOverrideModal to expose the onSave/onAttach/onRemove callbacks
jest.mock('./FieldOverrideModal', () => ({
  FieldOverrideModal: jest.fn(({ isOpen, onSave, onAttach, onRemove }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="field-override-modal">
        <button
          data-testid="mock-save"
          onClick={() => onSave({ mode: 'type', selectedType: mockSelectedType, selectedKey: 'xs:int' })}
        >
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

// Mock FieldOverrideService
jest.mock('../../../../services/document/field-override.service', () => ({
  FieldOverrideService: {
    applyFieldTypeOverride: jest.fn(),
    applyFieldSubstitution: jest.fn(),
    revertFieldTypeOverride: jest.fn(),
    revertFieldSubstitution: jest.fn(),
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

describe('FieldOverride', () => {
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

  it('should pass field to FieldOverrideModal when open', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    expect(lastCall[0].field).toBe(field);
  });

  it('should not render FieldOverrideModal when closed', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={false} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    expect(FieldOverrideModalMock).not.toHaveBeenCalled();
  });

  it('should call applyFieldTypeOverride and updateDocument on save', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback({ mode: 'type', selectedType: mockSelectedType, selectedKey: 'xs:int' });

    expect(FieldOverrideService.applyFieldTypeOverride).toHaveBeenCalledWith(
      field,
      mockSelectedType,
      testMappingTree.namespaceMap,
      FieldOverrideVariant.SAFE,
    );
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call addSchemaFilesForTypeOverride on save', () => {
    const field = testTargetDoc.fields[0];

    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback({ mode: 'type', selectedType: mockSelectedType, selectedKey: 'xs:int' });

    expect(FieldOverrideService.addSchemaFilesForTypeOverride).not.toHaveBeenCalled();
    expect(FieldOverrideService.applyFieldTypeOverride).toHaveBeenCalled();
  });

  it('should call addSchemaFilesForTypeOverride and updateDocument on attach', () => {
    const field = testTargetDoc.fields[0];
    const schemas = { 'custom.xsd': '<xs:schema/>' };

    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onAttachCallback = lastCall[0].onAttach;

    onAttachCallback(schemas);

    expect(FieldOverrideService.addSchemaFilesForTypeOverride).toHaveBeenCalledWith(field.ownerDocument, schemas);
    expect(mockUpdateDocument).toHaveBeenCalled();
    // Attach should not trigger onComplete or onClose
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call applyFieldSubstitution on save with substitution mode', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onSaveCallback = lastCall[0].onSave;

    onSaveCallback({ mode: 'substitution', selectedKey: 'sub:Cat' });

    expect(FieldOverrideService.applyFieldSubstitution).toHaveBeenCalledWith(
      field,
      'sub:Cat',
      testMappingTree.namespaceMap,
    );
    expect(FieldOverrideService.applyFieldTypeOverride).not.toHaveBeenCalled();
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call revertFieldTypeOverride and updateDocument on remove', () => {
    const field = testTargetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.SAFE;
    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onRemoveCallback = lastCall[0].onRemove;

    onRemoveCallback();

    expect(FieldOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(field, testMappingTree.namespaceMap);
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should pass onClose to FieldOverrideModal', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={true} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />);

    const FieldOverrideModalMock = jest.requireMock('./FieldOverrideModal').FieldOverrideModal;
    const lastCall = FieldOverrideModalMock.mock.calls[FieldOverrideModalMock.mock.calls.length - 1];
    const onCloseCallback = lastCall[0].onClose;

    onCloseCallback();

    expect(mockOnClose).toHaveBeenCalled();
    // onClose without save/remove should not trigger onComplete
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});

describe('revertOverride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call revertFieldSubstitution when field has SUBSTITUTION override', () => {
    const testTargetDoc = TestUtil.createTargetOrderDoc();
    const field = testTargetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.SUBSTITUTION;
    const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };
    const mockUpdateDocument = jest.fn();

    revertOverride(field, namespaceMap, mockUpdateDocument);

    expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(field, namespaceMap);
    expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    expect(mockUpdateDocument).toHaveBeenCalled();
  });

  it('should not call any service when field has no override', () => {
    const testTargetDoc = TestUtil.createTargetOrderDoc();
    const field = testTargetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.NONE;
    const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };
    const mockUpdateDocument = jest.fn();

    revertOverride(field, namespaceMap, mockUpdateDocument);

    expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    expect(FieldOverrideService.revertFieldSubstitution).not.toHaveBeenCalled();
    expect(mockUpdateDocument).not.toHaveBeenCalled();
  });

  it('should call revertFieldTypeOverride and updateDocument', () => {
    const testTargetDoc = TestUtil.createTargetOrderDoc();
    const field = testTargetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.SAFE;
    const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };
    const mockUpdateDocument = jest.fn();

    revertOverride(field, namespaceMap, mockUpdateDocument);

    expect(FieldOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(field, namespaceMap);
    expect(mockUpdateDocument).toHaveBeenCalledWith(
      field.ownerDocument,
      field.ownerDocument.definition,
      expect.any(String),
    );
  });
});
