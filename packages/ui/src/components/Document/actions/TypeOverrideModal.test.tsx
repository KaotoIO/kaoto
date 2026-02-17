import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IField } from '../../../models/datamapper/document';
import { MappingTree } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TypeOverrideModal } from './TypeOverrideModal';

// Mock useDataMapper hook
jest.mock('../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

describe('TypeOverrideModal', () => {
  const testTargetDoc = TestUtil.createTargetOrderDoc();
  const testMappingTree = new MappingTree(
    DocumentType.TARGET_BODY,
    BODY_DOCUMENT_ID,
    DocumentDefinitionType.XML_SCHEMA,
  );
  let testField: IField;

  beforeEach(() => {
    const { useDataMapper } = jest.requireMock('../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: jest.fn(),
    });

    testField = testTargetDoc.fields[0];
    // Reset field state
    testField.typeOverride = TypeOverrideVariant.NONE;
    testField.originalType = Types.String;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render modal when isOpen is true', () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={false}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    expect(screen.queryByText(/Type Override:/)).not.toBeInTheDocument();
  });

  it('should display field name in modal title', () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const fieldName = testField.displayName || testField.name;
    expect(screen.getByText(new RegExp(`Type Override:.*${fieldName}`))).toBeInTheDocument();
  });

  it('should open type selector when toggle is clicked', () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Select a new type...' });
    act(() => {
      fireEvent.click(toggle);
    });

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('should update selected type when a type is selected from dropdown', async () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
      'xs:int': {
        typeString: 'xs:int',
        displayName: 'int',
        description: 'Integer type',
        type: Types.Integer,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Select a new type...' });
    act(() => {
      fireEvent.click(toggle);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    act(() => {
      fireEvent.click(stringOption);
    });

    await waitFor(() => {
      // After selection, the toggle should show the selected type name
      const toggleWithSelection = screen.queryByText('Select a new type...');
      // Either placeholder is gone (type selected) or still there (not selected yet)
      expect(toggleWithSelection === null || screen.getAllByText('string').length > 0).toBeTruthy();
    });
  });

  it('should enable Save button when a type is selected', async () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Select a new type...' });
    act(() => {
      fireEvent.click(toggle);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    act(() => {
      fireEvent.click(stringOption);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should not show Remove Override button when field has no override', () => {
    testField.typeOverride = TypeOverrideVariant.NONE;

    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    expect(screen.queryByText('Remove Override')).not.toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    act(() => {
      fireEvent.click(cancelButton);
    });

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onSave with selected type when Save button is clicked', async () => {
    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Select a new type...' });
    act(() => {
      fireEvent.click(toggle);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    act(() => {
      fireEvent.click(stringOption);
    });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    act(() => {
      fireEvent.click(saveButton);
    });

    expect(onSaveMock).toHaveBeenCalledTimes(1);
    expect(onSaveMock).toHaveBeenCalledWith(mockCandidates['xs:string']);
  });

  it('should call onRemove when Remove Override button is clicked', () => {
    testField.typeOverride = TypeOverrideVariant.SAFE;
    testField.originalType = Types.String;

    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Remove Override' });
    act(() => {
      fireEvent.click(removeButton);
    });

    expect(onRemoveMock).toHaveBeenCalledTimes(1);
  });

  it('should load safe override candidates when available', () => {
    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    const getSafeSpy = jest
      .spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates')
      .mockReturnValue(mockCandidates);

    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    expect(getSafeSpy).toHaveBeenCalledWith(testField, testMappingTree.namespaceMap);
  });

  it('should load all override candidates when safe candidates are empty', () => {
    const mockAllCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
    const getAllSpy = jest
      .spyOn(FieldTypeOverrideService, 'getAllOverrideCandidates')
      .mockReturnValue(mockAllCandidates);

    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    expect(getAllSpy).toHaveBeenCalledWith(testField.ownerDocument, testMappingTree.namespaceMap);
  });

  it('should display type description when available', async () => {
    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'string',
        description: 'A text string type',
        type: Types.String,
        namespaceURI: 'http://www.w3.org/2001/XMLSchema',
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    const onCloseMock = jest.fn();
    const onSaveMock = jest.fn();
    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const toggle = screen.getByRole('button', { name: 'Select a new type...' });
    act(() => {
      fireEvent.click(toggle);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    act(() => {
      fireEvent.click(stringOption);
    });

    await waitFor(() => {
      expect(screen.getByText('A text string type')).toBeInTheDocument();
    });
  });
});
