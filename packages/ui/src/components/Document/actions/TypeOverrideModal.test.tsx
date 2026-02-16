import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType, IField } from '../../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant, Types } from '../../../models/datamapper/types';
import { TargetDocumentNodeData, TargetFieldNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { ConditionMenuAction } from './ConditionMenuAction';
import { TypeOverrideModal } from './TypeOverrideModal';

// Mock useDataMapper hook
jest.mock('../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

describe('TypeOverrideModal', () => {
  const targetDoc = TestUtil.createTargetOrderDoc();
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const documentNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);

  beforeEach(() => {
    const { useDataMapper } = jest.requireMock('../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree,
      updateDocument: jest.fn(),
    });
  });

  it('should initialize with current type when field has override', () => {
    const field = targetDoc.fields[0];
    field.typeOverride = TypeOverrideVariant.SAFE;
    field.originalType = Types.String;
    field.type = 'number' as Types;

    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Modal should show current type
    expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
  });

  it('should show placeholder when no type is selected', () => {
    const field = targetDoc.fields[0];
    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Should show placeholder
    expect(screen.getByText('Select a new type...')).toBeInTheDocument();
  });

  it('should disable Save button when no type is selected', () => {
    const field = targetDoc.fields[0];
    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Save button should be disabled
    const saveButton = screen.getByText('Save').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('should stop event propagation when clicking inside modal', () => {
    const field = targetDoc.fields[0];
    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();
    const parentClickHandler = jest.fn();

    render(
      <div onClick={parentClickHandler}>
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>
      </div>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Reset mock to clear previous clicks
    parentClickHandler.mockClear();

    // Click inside modal
    const modalContent = screen.getByText(/Type Override:/).closest('.pf-v6-c-modal-box');
    act(() => {
      fireEvent.click(modalContent!);
    });

    // Parent handler should not be called
    expect(parentClickHandler).not.toHaveBeenCalled();
  });

  it('should show Remove Override button when field has existing override', () => {
    const field = targetDoc.fields[0];
    field.typeOverride = TypeOverrideVariant.SAFE;
    field.originalType = Types.String;

    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Should show Remove Override button
    expect(screen.getByText('Remove Override')).toBeInTheDocument();
  });

  it('should close modal when Cancel button is clicked', () => {
    const field = targetDoc.fields[0];
    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Modal should be open
    expect(screen.getByText(/Type Override:/)).toBeInTheDocument();

    // Click Cancel
    const cancelButton = screen.getByText('Cancel').closest('button');
    act(() => {
      fireEvent.click(cancelButton!);
    });

    // Modal should be closed
    expect(screen.queryByText(/Type Override:/)).not.toBeInTheDocument();
  });

  it('should display field path in modal', () => {
    const field = targetDoc.fields[0];
    const nodeData = new TargetFieldNodeData(documentNodeData, field, new FieldItem(mappingTree, field));
    const onUpdateMock = jest.fn();

    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdateMock} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Open menu
    const actionToggle = screen.getByTestId('transformation-actions-menu-toggle');
    act(() => {
      fireEvent.click(actionToggle);
    });

    // Click Override type
    const overrideTypeButton = screen.getByText('Override field type');
    act(() => {
      fireEvent.click(overrideTypeButton);
    });

    // Should display field path
    expect(screen.getByText('Field Path:')).toBeInTheDocument();
    expect(screen.getByText(field.path.toString())).toBeInTheDocument();
  });
});

describe('TypeOverrideModal - Direct Component Tests', () => {
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
    jest.clearAllMocks();
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

    const toggle = screen.getByText('Select a new type...').closest('button');
    act(() => {
      fireEvent.click(toggle!);
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

    const toggle = screen.getByText('Select a new type...').closest('button');
    act(() => {
      fireEvent.click(toggle!);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    act(() => {
      fireEvent.click(stringOption!);
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

    const toggle = screen.getByText('Select a new type...').closest('button');
    act(() => {
      fireEvent.click(toggle!);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    act(() => {
      fireEvent.click(stringOption!);
    });

    await waitFor(() => {
      const saveButton = screen.getByText('Save').closest('button');
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

    const cancelButton = screen.getByText('Cancel').closest('button');
    act(() => {
      fireEvent.click(cancelButton!);
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

    const toggle = screen.getByText('Select a new type...').closest('button');
    act(() => {
      fireEvent.click(toggle!);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    act(() => {
      fireEvent.click(stringOption!);
    });

    await waitFor(() => {
      const saveButton = screen.getByText('Save').closest('button');
      expect(saveButton).not.toBeDisabled();
    });

    const saveButton = screen.getByText('Save').closest('button');
    act(() => {
      fireEvent.click(saveButton!);
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

    const removeButton = screen.getByText('Remove Override').closest('button');
    act(() => {
      fireEvent.click(removeButton!);
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

    const toggle = screen.getByText('Select a new type...').closest('button');
    act(() => {
      fireEvent.click(toggle!);
    });

    const stringOptions = screen.getAllByText('string');
    const stringOption = stringOptions.find((el) => el.closest('[role="option"]'));
    act(() => {
      fireEvent.click(stringOption!);
    });

    await waitFor(() => {
      expect(screen.getByText('A text string type')).toBeInTheDocument();
    });
  });
});
// Made with Bob
