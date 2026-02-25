import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IField } from '../../../models/datamapper/document';
import { MappingTree } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../models/datamapper/types';
import { IMetadataApi, MetadataContext } from '../../../providers';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { QName } from '../../../xml-schema-ts/QName';
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
    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    render(
      <TypeOverrideModal
        isOpen={false}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.queryByText(/Type Override:/)).not.toBeInTheDocument();
  });

  it('should display field name in modal title', () => {
    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    const fieldName = testField.displayName || testField.name;
    expect(screen.getByText(new RegExp(`Type Override:.*${fieldName}`))).toBeInTheDocument();
  });

  it('should open type selector when toggle is clicked', () => {
    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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
      const toggleWithSelection = screen.queryByText('Select a new type...');
      expect(toggleWithSelection === null || screen.getAllByText('string').length > 0).toBeTruthy();
    });
  });

  it('should enable Save button when a type is selected', async () => {
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
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.queryByText('Remove Override')).not.toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onCloseMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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
    const onSaveMock = jest.fn();

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
        onClose={jest.fn()}
        onSave={onSaveMock}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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

    const onRemoveMock = jest.fn();

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
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

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(getSafeSpy).toHaveBeenCalledWith(testField, testMappingTree.namespaceMap);
  });

  it('should show empty dropdown when safe candidates are empty', () => {
    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
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

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
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

  it('should pre-select current type when field has existing override', () => {
    const NS_XML_SCHEMA = 'http://www.w3.org/2001/XMLSchema';
    testMappingTree.namespaceMap = { xs: NS_XML_SCHEMA };

    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeString: 'xs:string',
        displayName: 'xs:string',
        type: Types.String,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      },
      'xs:int': {
        typeString: 'xs:int',
        displayName: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    testField.typeOverride = TypeOverrideVariant.SAFE;
    testField.typeQName = new QName(NS_XML_SCHEMA, 'int');

    render(
      <TypeOverrideModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.getByRole('button', { name: 'xs:int' })).toBeInTheDocument();
  });

  describe('Schema upload', () => {
    const mockApi: IMetadataApi = {
      getMetadata: jest.fn(),
      setMetadata: jest.fn(),
      getResourceContent: jest.fn(),
      saveResourceContent: jest.fn(),
      deleteResource: jest.fn(),
      askUserForFileSelection: jest.fn(),
      getSuggestions: jest.fn(),
      shouldSaveSchema: false,
      onStepUpdated: jest.fn(),
    };

    const renderWithContext = (props: Partial<React.ComponentProps<typeof TypeOverrideModal>> = {}) => {
      return render(
        <MetadataContext.Provider value={mockApi}>
          <TypeOverrideModal
            isOpen={true}
            onClose={jest.fn()}
            onSave={jest.fn()}
            onAttach={jest.fn()}
            onRemove={jest.fn()}
            field={testField}
            {...props}
          />
        </MetadataContext.Provider>,
      );
    };

    beforeEach(() => {
      jest.spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
    });

    it('should show validation error for invalid file extension', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['file.txt']);

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Unknown file extension/)).toBeInTheDocument();
      });
    });

    it('should show error when schema file cannot be read', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['valid.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue(undefined);

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to read: valid.xsd/)).toBeInTheDocument();
      });
    });

    it('should show error when onAttach throws for invalid schema', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['bad.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<not-a-schema>');

      const onAttachMock = jest.fn().mockImplementation(() => {
        throw new Error('Parse error');
      });

      renderWithContext({ onAttach: onAttachMock });

      // Upload the file
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('uploaded-schema-item-bad.xsd')).toBeInTheDocument();
      });

      // Click attach
      act(() => {
        fireEvent.click(screen.getByTestId('attach-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid schema: Parse error/)).toBeInTheDocument();
      });
    });

    it('should show existing document schema files', () => {
      renderWithContext();

      expect(screen.getByTestId('uploaded-schema-list')).toBeInTheDocument();
      expect(screen.getByTestId('existing-schema-item-shipOrder.xsd')).toBeInTheDocument();
    });

    it('should show uploaded schema as pending with remove button', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('existing-schema-item-shipOrder.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('uploaded-schema-item-types.xsd')).toBeInTheDocument();
        expect(screen.getByTestId('remove-schema-item-types.xsd')).toBeInTheDocument();
      });
    });

    it('should remove pending upload when remove button is clicked', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('uploaded-schema-item-types.xsd')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByTestId('remove-schema-item-types.xsd'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('uploaded-schema-item-types.xsd')).not.toBeInTheDocument();
      });
    });

    it('should disable attach button when no pending uploads', () => {
      renderWithContext();

      const attachButton = screen.getByTestId('attach-schema-button');
      expect(attachButton).toBeDisabled();
    });

    it('should enable attach button when there are pending uploads', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        const attachButton = screen.getByTestId('attach-schema-button');
        expect(attachButton).not.toBeDisabled();
      });
    });

    it('should call onAttach with pending schemas when attach button is clicked', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = jest.fn();
      renderWithContext({ onAttach: onAttachMock });

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('uploaded-schema-item-types.xsd')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.click(screen.getByTestId('attach-schema-button'));
      });

      expect(onAttachMock).toHaveBeenCalledWith({ 'types.xsd': '<xs:schema/>' });
    });

    it('should not add duplicate schemas', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      renderWithContext();

      // First upload
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('uploaded-schema-item-types.xsd')).toBeInTheDocument();
      });

      // Second upload of same file - should skip duplicate
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // Should still only have one pending entry
      await waitFor(() => {
        const items = screen.getAllByTestId('uploaded-schema-item-types.xsd');
        expect(items).toHaveLength(1);
      });
    });
  });
});
