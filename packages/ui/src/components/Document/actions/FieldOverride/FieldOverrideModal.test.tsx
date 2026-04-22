import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IField } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldTypeInfo, Types } from '../../../../models/datamapper/types';
import { IMetadataApi, MetadataContext } from '../../../../providers';
import { DataMapperMetadataService } from '../../../../services/datamapper-metadata.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { QName } from '../../../../xml-schema-ts/QName';
import { FieldOverrideModal } from './FieldOverrideModal';

// Mock useDataMapper hook
jest.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

describe('FieldOverrideModal', () => {
  let testTargetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let testMappingTree: MappingTree;
  let testField: IField;

  beforeEach(() => {
    testTargetDoc = TestUtil.createTargetOrderDoc();
    testMappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);

    const { useDataMapper } = jest.requireMock('../../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: jest.fn(),
    });

    testField = testTargetDoc.fields[0];
    testField.typeOverride = FieldOverrideVariant.NONE;
    testField.originalField = {
      name: testField.name,
      displayName: testField.displayName,
      namespaceURI: testField.namespaceURI,
      namespacePrefix: testField.namespacePrefix,
      type: Types.String,
      typeQName: null,
      namedTypeFragmentRefs: [],
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <FieldOverrideModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.getByText(/Field Override:/)).toBeInTheDocument();
  });

  it('should display field name in modal title', () => {
    render(
      <FieldOverrideModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    const fieldName = testField.displayName || testField.name;
    expect(screen.getByText(new RegExp(`Field Override:.*${fieldName}`))).toBeInTheDocument();
  });

  it('should open type selector when toggle is clicked', () => {
    render(
      <FieldOverrideModal
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
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        isBuiltIn: true,
      },
      'xs:int': {
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
        displayName: 'int',
        description: 'Integer type',
        type: Types.Integer,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
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
      // After selection, the toggle should show the selected type name
      const toggle = screen.getByRole('button', { name: /string/i });
      expect(toggle).toBeInTheDocument();
    });

    // Verify the placeholder text is no longer visible
    expect(screen.queryByText('Select a new type...')).not.toBeInTheDocument();
  });

  it('should enable Save button when a type is selected', async () => {
    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
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
    testField.typeOverride = FieldOverrideVariant.NONE;

    render(
      <FieldOverrideModal
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
      <FieldOverrideModal
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
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
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
    expect(onSaveMock).toHaveBeenCalledWith({
      mode: 'type',
      selectedType: mockCandidates['xs:string'],
      selectedKey: 'xs:string',
    });
  });

  it('should call onRemove when Remove Override button is clicked', () => {
    testField.typeOverride = FieldOverrideVariant.SAFE;
    testField.originalField = {
      name: testField.name,
      displayName: testField.displayName,
      namespaceURI: testField.namespaceURI,
      namespacePrefix: testField.namespacePrefix,
      type: Types.String,
      typeQName: null,
      namedTypeFragmentRefs: [],
    };

    const onRemoveMock = jest.fn();

    render(
      <FieldOverrideModal
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
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    const getSafeSpy = jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
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
    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});

    render(
      <FieldOverrideModal
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
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'A text string type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
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
        typeQName: new QName(NS_XML_SCHEMA, 'string'),
        displayName: 'xs:string',
        type: Types.String,
        isBuiltIn: true,
      },
      'xs:int': {
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        displayName: 'xs:int',
        type: Types.Integer,
        isBuiltIn: true,
      },
    };

    jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    testField.typeOverride = FieldOverrideVariant.SAFE;
    testField.typeQName = new QName(NS_XML_SCHEMA, 'int');

    render(
      <FieldOverrideModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        onAttach={jest.fn()}
        onRemove={jest.fn()}
        field={testField}
      />,
    );

    expect(screen.getByRole('button', { name: 'xs:int' })).toBeInTheDocument();
  });

  describe('Substitution mode', () => {
    const mockSubstitutionCandidates: Record<string, { displayName: string; qname: QName }> = {
      'sub:Cat': {
        displayName: 'Cat',
        qname: new QName('http://example.com/substitution', 'Cat'),
      },
      'sub:Dog': {
        displayName: 'Dog',
        qname: new QName('http://example.com/substitution', 'Dog'),
      },
    };

    it('should load substitution candidates when Substitute Element radio is selected', () => {
      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      const getSubstitutionSpy = jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      const substitutionRadio = screen.getByLabelText('Substitute Element');
      act(() => {
        fireEvent.click(substitutionRadio);
      });

      expect(getSubstitutionSpy).toHaveBeenCalledWith(testField, testMappingTree.namespaceMap);
    });

    it('should show substitution placeholder when mode is switched', () => {
      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      act(() => {
        fireEvent.click(screen.getByLabelText('Substitute Element'));
      });

      expect(screen.getByRole('button', { name: 'Select a substitute element...' })).toBeInTheDocument();
    });

    it('should call onSave with substitution payload when saving in substitution mode', async () => {
      const onSaveMock = jest.fn();
      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={onSaveMock}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Switch to substitution mode
      act(() => {
        fireEvent.click(screen.getByLabelText('Substitute Element'));
      });

      // Open dropdown and select Cat
      const toggle = screen.getByRole('button', { name: 'Select a substitute element...' });
      act(() => {
        fireEvent.click(toggle);
      });

      const catOption = screen.getAllByText('Cat').find((el) => el.closest('[role="option"]'));
      if (!catOption) throw new Error('Cat option not found');
      act(() => {
        fireEvent.click(catOption);
      });

      // Save
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      act(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      });

      expect(onSaveMock).toHaveBeenCalledTimes(1);
      expect(onSaveMock).toHaveBeenCalledWith({ mode: 'substitution', selectedKey: 'sub:Cat' });
    });

    it('should clear selection when switching modes', async () => {
      const mockTypeCandidates: Record<string, IFieldTypeInfo> = {
        'xs:string': {
          typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
          displayName: 'string',
          type: Types.String,
          isBuiltIn: true,
        },
      };

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockTypeCandidates);
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Select a type in type mode
      const typeToggle = screen.getByRole('button', { name: 'Select a new type...' });
      act(() => {
        fireEvent.click(typeToggle);
      });
      const stringOption = screen.getAllByText('string').find((el) => el.closest('[role="option"]'));
      if (!stringOption) throw new Error('string option not found');
      act(() => {
        fireEvent.click(stringOption);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      // Switch to substitution mode — selection should reset, Save should be disabled
      act(() => {
        fireEvent.click(screen.getByLabelText('Substitute Element'));
      });

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Select a substitute element...' })).toBeInTheDocument();
    });

    it('should start in substitution mode when field has existing substitution', () => {
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Should auto-select substitution radio and show substitution placeholder
      expect(screen.getByLabelText('Substitute Element')).toBeChecked();
      expect(screen.getByRole('button', { name: 'Select a substitute element...' })).toBeInTheDocument();
    });

    it('should pre-select the active substitute element when field has existing substitution', () => {
      const SUB_NS = 'http://example.com/substitution';
      testMappingTree.namespaceMap = { sub: SUB_NS };
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;
      testField.name = 'Cat';
      testField.namespaceURI = SUB_NS;

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // The active substitute 'sub:Cat' should be pre-selected in the dropdown toggle
      expect(screen.getByRole('button', { name: 'Cat' })).toBeInTheDocument();
    });

    it('should disable Override Type radio when field has existing substitution', () => {
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Substitution mode is active, so Override Type radio should be disabled
      expect(screen.getByLabelText('Override Type')).toBeDisabled();
      // The active mode radio should remain enabled
      expect(screen.getByLabelText('Substitute Element')).not.toBeDisabled();
    });

    it('should disable Substitute Element radio when field has existing type override', () => {
      testField.typeOverride = FieldOverrideVariant.SAFE;

      const mockTypeCandidates: Record<string, IFieldTypeInfo> = {
        'xs:int': {
          typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
          displayName: 'int',
          type: Types.Integer,
          isBuiltIn: true,
        },
      };

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockTypeCandidates);
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Type mode is active, so Substitute Element radio should be disabled
      expect(screen.getByLabelText('Substitute Element')).toBeDisabled();
      // The active mode radio should remain enabled
      expect(screen.getByLabelText('Override Type')).not.toBeDisabled();
    });

    it('should not disable radios when field has no existing override', () => {
      testField.typeOverride = FieldOverrideVariant.NONE;

      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      jest
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as never);

      render(
        <FieldOverrideModal
          onClose={jest.fn()}
          onSave={jest.fn()}
          onAttach={jest.fn()}
          onRemove={jest.fn()}
          field={testField}
        />,
      );

      // Both radios should be enabled when there's no override
      expect(screen.getByLabelText('Override Type')).not.toBeDisabled();
      expect(screen.getByLabelText('Substitute Element')).not.toBeDisabled();
    });
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

    const renderWithContext = (props: Partial<React.ComponentProps<typeof FieldOverrideModal>> = {}) => {
      return render(
        <MetadataContext.Provider value={mockApi}>
          <FieldOverrideModal
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
      jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
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

      // Upload the file - it will immediately try to attach
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // Error should appear immediately since attachment happens on upload
      await waitFor(() => {
        expect(screen.getByText(/Invalid schema: Parse error/)).toBeInTheDocument();
      });

      // onAttach should have been called immediately
      expect(onAttachMock).toHaveBeenCalledWith({ 'bad.xsd': '<not-a-schema>' });
    });

    it('should show existing document schema files', () => {
      renderWithContext();

      expect(screen.getByTestId('uploaded-schema-list')).toBeInTheDocument();
      expect(screen.getByTestId('existing-schema-item-shipOrder.xsd')).toBeInTheDocument();
    });

    it('should immediately attach uploaded schema and show in existing files', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = jest.fn();
      renderWithContext({ onAttach: onAttachMock });

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // Schema should be immediately attached (no pending state)
      await waitFor(() => {
        expect(onAttachMock).toHaveBeenCalledWith({ 'types.xsd': '<xs:schema/>' });
      });

      // Existing files should still be visible
      expect(screen.getByTestId('existing-schema-item-shipOrder.xsd')).toBeInTheDocument();
    });

    it('should call onAttach immediately when schema is uploaded', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = jest.fn();
      renderWithContext({ onAttach: onAttachMock });

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // onAttach should be called immediately with the schema content
      await waitFor(() => {
        expect(onAttachMock).toHaveBeenCalledWith({ 'types.xsd': '<xs:schema/>' });
      });
    });

    it('should not add duplicate schemas on second upload', async () => {
      jest.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as jest.Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = jest.fn();
      renderWithContext({ onAttach: onAttachMock });

      // First upload
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(onAttachMock).toHaveBeenCalledTimes(1);
      });

      // Reset mock to track second call
      onAttachMock.mockClear();

      // Second upload of same file - should skip duplicate
      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // onAttach should not be called again for duplicate
      await waitFor(() => {
        expect(onAttachMock).not.toHaveBeenCalled();
      });
    });
  });
});
