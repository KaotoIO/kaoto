import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, IFieldTypeInfo, Types } from '../../../../models/datamapper/types';
import { IMetadataApi, MetadataContext } from '../../../../providers';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import {
  createDataMapperContext,
  createDataMapperContextWrapper,
} from '../../../../stubs/datamapper/data-mapper-context';
import { QName } from '../../../../xml-schema-ts/QName';
import { FieldOverride } from './FieldOverride';

const mockSelectedType: IFieldTypeInfo = {
  typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
  displayName: 'int',
  type: Types.Integer,
  isBuiltIn: true,
};

const mockSubstituteInfo: IFieldSubstituteInfo = {
  qname: new QName('http://example.com/substitution', 'Cat'),
  displayName: 'Cat',
  type: Types.Container,
  typeQName: null,
  namedTypeFragmentRefs: [],
};

describe('FieldOverride', () => {
  let testTargetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
  let testMappingTree: MappingTree;
  let wrapper: FunctionComponent<PropsWithChildren>;
  const mockUpdateDocument = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnClose = vi.fn();
  const metadataApi: IMetadataApi = {
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
    getResourceContent: vi.fn(() => Promise.resolve('<xs:schema/>')),
    isResourceExist: vi.fn(),
    saveResourceContent: vi.fn(),
    deleteResource: vi.fn(),
    askUserForFileSelection: vi.fn(() => Promise.resolve(['custom.xsd'])),
    getSuggestions: vi.fn(),
    shouldSaveSchema: false,
    onStepUpdated: vi.fn(),
  };

  beforeEach(() => {
    testTargetDoc = TestUtil.createTargetOrderDoc();
    testMappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    vi.clearAllMocks();

    vi.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue({ 'xs:int': mockSelectedType });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'sub:Cat': mockSubstituteInfo,
    });
    vi.spyOn(FieldOverrideService, 'applyFieldTypeOverride').mockImplementation(() => {});
    vi.spyOn(FieldOverrideService, 'applyFieldSubstitution').mockImplementation(() => {});
    vi.spyOn(FieldOverrideService, 'revertOverride').mockImplementation(() => {});
    vi.spyOn(FieldOverrideService, 'addSchemaFilesForTypeOverride').mockImplementation(() => {});

    const DataMapperContextWrapper = createDataMapperContextWrapper(
      createDataMapperContext({ mappingTree: testMappingTree, updateDocument: mockUpdateDocument }),
    );
    wrapper = ({ children }) => (
      <MetadataContext.Provider value={metadataApi}>
        <DataMapperContextWrapper>{children}</DataMapperContextWrapper>
      </MetadataContext.Provider>
    );
  });

  /** Opens the typeahead dropdown and picks the option with the given label. */
  const selectOption = (label: string) => {
    const toggle = screen
      .getByTestId('type-select')
      .closest('.pf-v6-c-menu-toggle')!
      .querySelector('.pf-v6-c-menu-toggle__button') as HTMLButtonElement;
    fireEvent.click(toggle);

    const option = screen.getAllByText(label).find((el) => el.closest('[role="option"]'));
    if (!option) throw new Error(`${label} option not found`);
    fireEvent.click(option);
  };

  const clickSave = async () => {
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  };

  it('should pass field to FieldOverrideModal when open', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    expect(screen.getByText(new RegExp(`Field Override:.*${field.displayName || field.name}`))).toBeInTheDocument();
  });

  it('should not render FieldOverrideModal when closed', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen={false} field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, {
      wrapper,
    });

    expect(screen.queryByText(/Field Override:/)).not.toBeInTheDocument();
  });

  it('should call applyFieldTypeOverride and updateDocument on save', async () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    selectOption('int');
    await clickSave();

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

  it('should not call addSchemaFilesForTypeOverride on save', async () => {
    const field = testTargetDoc.fields[0];

    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    selectOption('int');
    await clickSave();

    expect(FieldOverrideService.addSchemaFilesForTypeOverride).not.toHaveBeenCalled();
    expect(FieldOverrideService.applyFieldTypeOverride).toHaveBeenCalled();
  });

  it('should call addSchemaFilesForTypeOverride and updateDocument on attach', async () => {
    const field = testTargetDoc.fields[0];
    const schemas = { 'custom.xsd': '<xs:schema/>' };

    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    fireEvent.click(screen.getByTestId('upload-schema-button'));

    await waitFor(() => {
      expect(FieldOverrideService.addSchemaFilesForTypeOverride).toHaveBeenCalledWith(field.ownerDocument, schemas);
    });
    expect(mockUpdateDocument).toHaveBeenCalled();
    // Attach should not trigger onComplete or onClose
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call applyFieldSubstitution on save with substitution mode', async () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    fireEvent.click(screen.getByRole('radio', { name: 'Substitute Element' }));
    selectOption('Cat');
    await clickSave();

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

  it('should call revertOverride and updateDocument on remove', () => {
    const field = testTargetDoc.fields[0];
    field.typeOverride = FieldOverrideVariant.SAFE;
    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Remove Override' }));

    expect(FieldOverrideService.revertOverride).toHaveBeenCalledWith(field, testMappingTree.namespaceMap);
    expect(mockUpdateDocument).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should pass onClose to FieldOverrideModal', () => {
    const field = testTargetDoc.fields[0];
    render(<FieldOverride isOpen field={field} onComplete={mockOnComplete} onClose={mockOnClose} />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
    // onClose without save/remove should not trigger onComplete
    expect(mockOnComplete).not.toHaveBeenCalled();
  });
});
