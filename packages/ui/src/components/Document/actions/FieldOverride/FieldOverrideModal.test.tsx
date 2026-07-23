import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IField } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, IFieldTypeInfo, Types } from '../../../../models/datamapper/types';
import { IMetadataApi, MetadataContext } from '../../../../providers';
import { IDataMapperContext } from '../../../../providers/datamapper.provider';
import { DataMapperMetadataService } from '../../../../services/datamapper-metadata.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { QName } from '../../../../xml-schema-ts/QName';
import { FieldOverrideModal } from './FieldOverrideModal';

// Mock useDataMapper hook
vi.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: vi.fn(),
}));

describe('FieldOverrideModal', () => {
  let testTargetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let testMappingTree: MappingTree;
  let testField: IField;

  beforeEach(() => {
    testTargetDoc = TestUtil.createTargetOrderDoc();
    testMappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);

    vi.mocked(useDataMapper).mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: vi.fn(),
    } as Partial<IDataMapperContext> as IDataMapperContext);

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
    vi.restoreAllMocks();
  });

  /** Returns the MenuToggle chevron button that opens/closes the typeahead dropdown. */
  const getMenuToggle = () =>
    screen
      .getByTestId('type-select')
      .closest('.pf-v6-c-menu-toggle')!
      .querySelector('.pf-v6-c-menu-toggle__button') as HTMLButtonElement;

  /** Returns the typeahead text input. */
  const getTypeSelectInput = () => screen.getByTestId('type-select').querySelector('input') as HTMLInputElement;

  it('should render modal when isOpen is true', () => {
    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    expect(screen.getByText(/Field Override:/)).toBeInTheDocument();
  });

  it('should display field name in modal title', () => {
    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    const fieldName = testField.displayName || testField.name;
    expect(screen.getByText(new RegExp(`Field Override:.*${fieldName}`))).toBeInTheDocument();
  });

  it('should open type selector when toggle is clicked', () => {
    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    fireEvent.click(getMenuToggle());

    expect(screen.getByRole('listbox')).toBeInTheDocument();
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

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    fireEvent.click(getMenuToggle());

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    fireEvent.click(stringOption);

    await waitFor(() => {
      // After selection, the input should show the selected type label
      expect(getTypeSelectInput().value).toBe('string');
    });
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

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    fireEvent.click(getMenuToggle());

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    fireEvent.click(stringOption);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should not show Remove Override button when field has no override', () => {
    testField.typeOverride = FieldOverrideVariant.NONE;

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    expect(screen.queryByText('Remove Override')).not.toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <FieldOverrideModal
        onClose={onCloseMock}
        onSave={vi.fn()}
        onAttach={vi.fn()}
        onRemove={vi.fn()}
        field={testField}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onSave with selected type when Save button is clicked', async () => {
    const onSaveMock = vi.fn();

    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        displayName: 'string',
        description: 'String type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal
        onClose={vi.fn()}
        onSave={onSaveMock}
        onAttach={vi.fn()}
        onRemove={vi.fn()}
        field={testField}
      />,
    );

    fireEvent.click(getMenuToggle());

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    if (!stringOption) {
      throw new Error('String option not found');
    }
    fireEvent.click(stringOption);

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

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

    const onRemoveMock = vi.fn();

    render(
      <FieldOverrideModal
        onClose={vi.fn()}
        onSave={vi.fn()}
        onAttach={vi.fn()}
        onRemove={onRemoveMock}
        field={testField}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Remove Override' });
    fireEvent.click(removeButton);

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

    const getSafeSpy = vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    expect(getSafeSpy).toHaveBeenCalledWith(testField, testMappingTree.namespaceMap);
  });

  it('should show empty dropdown when safe candidates are empty', () => {
    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();
  });

  it('should display namespace URI as description when available', async () => {
    const NS_XS = 'http://www.w3.org/2001/XMLSchema';
    const mockCandidates: Record<string, IFieldTypeInfo> = {
      'xs:string': {
        typeQName: new QName(NS_XS, 'string'),
        displayName: 'string',
        description: 'A text string type',
        type: Types.String,
        isBuiltIn: true,
      },
    };

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    fireEvent.click(getMenuToggle());

    // Namespace URI is shown as description in the dropdown; type description is not rendered
    await waitFor(() => {
      expect(screen.getByText(`Namespace URI: ${NS_XS}`)).toBeInTheDocument();
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

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

    testField.typeOverride = FieldOverrideVariant.SAFE;
    testField.typeQName = new QName(NS_XML_SCHEMA, 'int');

    render(
      <FieldOverrideModal onClose={vi.fn()} onSave={vi.fn()} onAttach={vi.fn()} onRemove={vi.fn()} field={testField} />,
    );

    expect(getTypeSelectInput().value).toBe('xs:int');
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
      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      const getSubstitutionSpy = vi
        .spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates')
        .mockReturnValue(mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>);

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      const substitutionRadio = screen.getByRole('radio', { name: 'Substitute Element' });
      fireEvent.click(substitutionRadio);

      expect(getSubstitutionSpy).toHaveBeenCalledWith(testField, testMappingTree.namespaceMap);
    });

    it('should show substitution placeholder when mode is switched', () => {
      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      fireEvent.click(screen.getByRole('radio', { name: 'Substitute Element' }));

      expect(getTypeSelectInput()).toHaveAttribute('placeholder', 'Select a substitute element...');
    });

    it('should call onSave with substitution payload when saving in substitution mode', async () => {
      const onSaveMock = vi.fn();
      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={onSaveMock}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Switch to substitution mode
      fireEvent.click(screen.getByRole('radio', { name: 'Substitute Element' }));

      // Open dropdown and select Cat
      fireEvent.click(getMenuToggle());

      const catOption = screen.getAllByText('Cat').find((el) => el.closest('[role="option"]'));
      if (!catOption) throw new Error('Cat option not found');
      fireEvent.click(catOption);

      // Save
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

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

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockTypeCandidates);
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Select a type in type mode
      fireEvent.click(getMenuToggle());
      const stringOption = screen.getAllByText('string').find((el) => el.closest('[role="option"]'));
      if (!stringOption) throw new Error('string option not found');
      fireEvent.click(stringOption);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      // Switch to substitution mode — selection should reset, Save should be disabled
      fireEvent.click(screen.getByRole('radio', { name: 'Substitute Element' }));

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      expect(getTypeSelectInput()).toHaveAttribute('placeholder', 'Select a substitute element...');
    });

    it('should start in substitution mode when field has existing substitution', () => {
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Should auto-select substitution radio and show substitution placeholder
      expect(screen.getByRole('radio', { name: 'Substitute Element' })).toBeChecked();
      expect(getTypeSelectInput()).toHaveAttribute('placeholder', 'Select a substitute element...');
    });

    it('should pre-select the active substitute element when field has existing substitution', () => {
      const SUB_NS = 'http://example.com/substitution';
      testMappingTree.namespaceMap = { sub: SUB_NS };
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;
      testField.name = 'Cat';
      testField.namespaceURI = SUB_NS;

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // The active substitute 'sub:Cat' should be pre-selected in the input
      expect(getTypeSelectInput().value).toBe('Cat');
    });

    it('should disable Override Type radio when field has existing substitution', () => {
      testField.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Substitution mode is active, so Override Type radio should be disabled
      expect(screen.getByRole('radio', { name: 'Override Type' })).toBeDisabled();
      // The active mode radio should remain enabled
      expect(screen.getByRole('radio', { name: 'Substitute Element' })).not.toBeDisabled();
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

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockTypeCandidates);
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Type mode is active, so Substitute Element radio should be disabled
      expect(screen.getByRole('radio', { name: 'Substitute Element' })).toBeDisabled();
      // The active mode radio should remain enabled
      expect(screen.getByRole('radio', { name: 'Override Type' })).not.toBeDisabled();
    });

    it('should not disable radios when field has no existing override', () => {
      testField.typeOverride = FieldOverrideVariant.NONE;

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue(
        mockSubstitutionCandidates as Record<string, IFieldSubstituteInfo>,
      );

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Both radios should be enabled when there's no override
      expect(screen.getByRole('radio', { name: 'Override Type' })).not.toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Substitute Element' })).not.toBeDisabled();
    });
  });

  describe('Schema upload', () => {
    const mockApi: IMetadataApi = {
      getMetadata: vi.fn(),
      setMetadata: vi.fn(),
      getResourceContent: vi.fn(),
      isResourceExist: vi.fn(),
      saveResourceContent: vi.fn(),
      deleteResource: vi.fn(),
      askUserForFileSelection: vi.fn(),
      getSuggestions: vi.fn(),
      shouldSaveSchema: false,
      onStepUpdated: vi.fn(),
    };

    const renderWithContext = (props: Partial<React.ComponentProps<typeof FieldOverrideModal>> = {}) => {
      return render(
        <MetadataContext.Provider value={mockApi}>
          <FieldOverrideModal
            onClose={vi.fn()}
            onSave={vi.fn()}
            onAttach={vi.fn()}
            onRemove={vi.fn()}
            field={testField}
            {...props}
          />
        </MetadataContext.Provider>,
      );
    };

    beforeEach(() => {
      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
    });

    it('should show validation error for invalid file extension', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['file.txt']);

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Unknown file extension/)).toBeInTheDocument();
      });
    });

    it('should show error when schema file cannot be read', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['valid.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue(undefined);

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to read: valid.xsd/)).toBeInTheDocument();
      });
    });

    it('should show error when onAttach throws for invalid schema', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['bad.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue('<not-a-schema>');

      const onAttachMock = vi.fn().mockImplementation(() => {
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
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = vi.fn();
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
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = vi.fn();
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
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = vi.fn();
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

    it('should show spinner and disable button while uploading schema', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['types.xsd']);
      (mockApi.getResourceContent as Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve('<xs:schema/>');
            }, 100),
          ),
      );

      renderWithContext();

      const uploadButton = screen.getByTestId('upload-schema-button');

      // Button should be enabled initially
      expect(uploadButton).not.toBeDisabled();

      fireEvent.click(uploadButton);

      // After file selection, spinner should appear and button should be disabled
      await waitFor(() => {
        const spinner = screen.getByLabelText('Uploading schema files');
        expect(spinner).toBeInTheDocument();
        expect(uploadButton).toBeDisabled();
      });

      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.queryByLabelText('Uploading schema files')).not.toBeInTheDocument();
        expect(uploadButton).not.toBeDisabled();
      });
    });

    it('should not show spinner while file picker dialog is open', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              resolve(['types.xsd']);
            }, 200),
          ),
      );

      renderWithContext();

      const uploadButton = screen.getByTestId('upload-schema-button');

      fireEvent.click(uploadButton);

      // Spinner should not appear while file picker is open
      expect(screen.queryByLabelText('Uploading schema files')).not.toBeInTheDocument();
      expect(uploadButton).not.toBeDisabled();
    });

    it('should clear loading state when upload fails', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['bad.xsd']);
      (mockApi.getResourceContent as Mock).mockRejectedValue(new Error('Network error'));

      renderWithContext();

      const uploadButton = screen.getByTestId('upload-schema-button');

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Loading state should be cleared even after error
      await waitFor(() => {
        expect(screen.queryByLabelText('Uploading schema files')).not.toBeInTheDocument();
        expect(uploadButton).not.toBeDisabled();
      });

      // Error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Failed to upload/)).toBeInTheDocument();
      });
    });

    it('should clear loading state when validation fails', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['invalid.txt']);

      renderWithContext();

      const uploadButton = screen.getByTestId('upload-schema-button');

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Loading state should not appear for validation errors (fails before loading starts)
      expect(screen.queryByLabelText('Uploading schema files')).not.toBeInTheDocument();
      expect(uploadButton).not.toBeDisabled();

      // Validation error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Unknown file extension/)).toBeInTheDocument();
      });
    });

    it('should clear loading state when schema attachment fails', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['bad.xsd']);
      (mockApi.getResourceContent as Mock).mockResolvedValue('<xs:schema/>');

      const onAttachMock = vi.fn().mockImplementation(() => {
        throw new Error('Invalid schema structure');
      });

      renderWithContext({ onAttach: onAttachMock });

      const uploadButton = screen.getByTestId('upload-schema-button');

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Loading state should be cleared after attachment error
      await waitFor(() => {
        expect(screen.queryByLabelText('Uploading schema files')).not.toBeInTheDocument();
        expect(uploadButton).not.toBeDisabled();
      });

      // Error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Invalid schema: Invalid schema structure/)).toBeInTheDocument();
      });
    });

    it('should skip reading a file already present in uploadedSchemas', async () => {
      const getResourceContentMock = mockApi.getResourceContent as Mock;

      // First upload succeeds
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValueOnce(['types.xsd']);
      getResourceContentMock.mockResolvedValueOnce('<xs:schema/>');

      const onAttachMock = vi.fn();
      renderWithContext({ onAttach: onAttachMock });

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });
      await waitFor(() => {
        expect(onAttachMock).toHaveBeenCalledTimes(1);
      });

      // Second upload of same file — getResourceContent should NOT be called again
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValueOnce(['types.xsd']);
      getResourceContentMock.mockClear();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      await waitFor(() => {
        expect(getResourceContentMock).not.toHaveBeenCalled();
      });
    });

    it('should skip reading a file already in existingFiles', async () => {
      const getResourceContentMock = mockApi.getResourceContent as Mock;

      // 'shipOrder.xsd' is already in existingFiles (from testTargetDoc definition)
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue(['shipOrder.xsd']);
      getResourceContentMock.mockClear();

      renderWithContext();

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      // File is already in existingFiles — getResourceContent should not be called
      expect(getResourceContentMock).not.toHaveBeenCalled();
    });

    it('should do nothing when file picker returns empty selection', async () => {
      vi.spyOn(DataMapperMetadataService, 'selectDocumentSchema').mockResolvedValue([]);
      const onAttachMock = vi.fn();
      renderWithContext({ onAttach: onAttachMock });

      await act(async () => {
        fireEvent.click(screen.getByTestId('upload-schema-button'));
      });

      expect(onAttachMock).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should not call onSave when Save is clicked with no selection', () => {
      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      const onSaveMock = vi.fn();

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={onSaveMock}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Save button is disabled when no key is selected, but click it anyway to confirm guard
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).toBeDisabled();
      fireEvent.click(saveButton);
      expect(onSaveMock).not.toHaveBeenCalled();
    });

    it('should retain the original selection when typing a non-candidate value into the filter input', async () => {
      const mockCandidates: Record<string, IFieldTypeInfo> = {
        'xs:string': {
          typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
          displayName: 'string',
          type: Types.String,
          isBuiltIn: true,
        },
      };

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);
      const onSaveMock = vi.fn();

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={onSaveMock}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      // Select a valid type first
      fireEvent.click(getMenuToggle());
      const stringOption = screen.getAllByText('string').find((el) => el.closest('[role="option"]'));
      if (!stringOption) throw new Error('string option not found');
      fireEvent.click(stringOption);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
      });

      // Typing into the filter input only updates filterText in TypeaheadSelect;
      // it never calls onChange, so selectedKey stays 'xs:string'.
      const input = screen.getByTestId('type-select').querySelector('input') as HTMLInputElement;
      act(() => {
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'unknown-key' } });
      });

      // Save should still fire with the original valid selection intact
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onSaveMock).toHaveBeenCalledWith({
        mode: 'type',
        selectedType: mockCandidates['xs:string'],
        selectedKey: 'xs:string',
      });
    });

    it('should start in substitution mode when field wrapperKind is abstract', () => {
      const abstractField = { ...testField, wrapperKind: 'abstract' as const, typeOverride: FieldOverrideVariant.NONE };

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({});

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={abstractField}
        />,
      );

      // Abstract wrapper fields always start in substitution mode
      expect(screen.getByRole('radio', { name: 'Substitute Element' })).toBeChecked();
    });

    it('should show Remove Override button for abstract wrapper field', () => {
      const abstractField = { ...testField, wrapperKind: 'abstract' as const, typeOverride: FieldOverrideVariant.NONE };

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({});
      vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({});

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={abstractField}
        />,
      );

      // Abstract wrapper is treated as having an existing override
      expect(screen.getByRole('button', { name: 'Remove Override' })).toBeInTheDocument();
    });

    it('should build typeahead options with only namespace URI as description', async () => {
      const NS_XS = 'http://www.w3.org/2001/XMLSchema';
      testMappingTree.namespaceMap = { xs: NS_XS };

      const mockCandidates: Record<string, IFieldTypeInfo> = {
        'xs:int': {
          typeQName: new QName(NS_XS, 'int'),
          displayName: 'int',
          type: Types.Integer,
          isBuiltIn: true,
          description: 'Integer scalar type',
        },
      };

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      fireEvent.click(getMenuToggle());

      // The description rendered in the SelectOption should show only the namespace URI
      await waitFor(() => {
        expect(screen.getByText(`Namespace URI: ${NS_XS}`)).toBeInTheDocument();
        expect(screen.queryByText(/Integer scalar type/)).not.toBeInTheDocument();
      });
    });

    it('should build typeahead options with only namespaceURI when description is absent', async () => {
      const NS_XS = 'http://www.w3.org/2001/XMLSchema';
      testMappingTree.namespaceMap = { xs: NS_XS };

      const mockCandidates: Record<string, IFieldTypeInfo> = {
        'xs:int': {
          typeQName: new QName(NS_XS, 'int'),
          displayName: 'int',
          type: Types.Integer,
          isBuiltIn: true,
          // no description
        },
      };

      vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

      render(
        <FieldOverrideModal
          onClose={vi.fn()}
          onSave={vi.fn()}
          onAttach={vi.fn()}
          onRemove={vi.fn()}
          field={testField}
        />,
      );

      fireEvent.click(getMenuToggle());

      await waitFor(() => {
        expect(screen.getByText(`Namespace URI: ${NS_XS}`)).toBeInTheDocument();
      });
    });
  });
});
