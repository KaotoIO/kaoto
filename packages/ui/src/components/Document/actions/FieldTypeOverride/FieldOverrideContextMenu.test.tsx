import { act, fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { MappingTree } from '../../../../models/datamapper/mapping';
import { TypeOverrideVariant } from '../../../../models/datamapper/types';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { FieldOverrideContextMenu } from './FieldOverrideContextMenu';

jest.mock('../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

jest.mock('./FieldTypeOverride', () => ({
  FieldTypeOverride: jest.fn(({ isOpen }) => (isOpen ? <div data-testid="field-type-override" /> : null)),
  revertTypeOverride: jest.fn(),
}));

describe('FieldOverrideContextMenu', () => {
  const testTargetDoc = TestUtil.createTargetOrderDoc();
  const testMappingTree = new MappingTree(
    DocumentType.TARGET_BODY,
    BODY_DOCUMENT_ID,
    DocumentDefinitionType.XML_SCHEMA,
  );
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useDataMapper } = jest.requireMock('../../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: jest.fn(),
    });
  });

  it('should render children and provide onContextMenu handler', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => (
          <button data-testid="child" onContextMenu={onContextMenu}>
            Child content
          </button>
        )}
      </FieldOverrideContextMenu>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should not show context menu initially', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should show context menu on right-click', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    expect(screen.getByText('Override Type...')).toBeInTheDocument();
  });

  it('should not show context menu when field is undefined', () => {
    render(
      <FieldOverrideContextMenu field={undefined} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should not show context menu when isReadOnly is true', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} isReadOnly={true} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should close context menu on outside click', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });
    expect(screen.getByText('Override Type...')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseDown(document.body);
    });
    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should close context menu on Escape key', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });
    expect(screen.getByText('Override Type...')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should open type override modal when Override Type is clicked', () => {
    const field = testTargetDoc.fields[0];

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Override Type...'));
    });

    expect(screen.getByTestId('field-type-override')).toBeInTheDocument();
  });

  it('should show Reset Override option when field has an override', () => {
    const field = testTargetDoc.fields[0];
    field.typeOverride = TypeOverrideVariant.SAFE;

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    expect(screen.getByText('Reset Override')).toBeInTheDocument();

    // Clean up
    field.typeOverride = TypeOverrideVariant.NONE;
  });

  it('should call revertTypeOverride and onUpdate when Reset Override is clicked', () => {
    const { revertTypeOverride } = jest.requireMock('./FieldTypeOverride');
    const { useDataMapper } = jest.requireMock('../../../../hooks/useDataMapper');
    const mockUpdateDocument = jest.fn();
    useDataMapper.mockReturnValue({
      mappingTree: testMappingTree,
      updateDocument: mockUpdateDocument,
    });

    const field = testTargetDoc.fields[0];
    field.typeOverride = TypeOverrideVariant.SAFE;

    render(
      <FieldOverrideContextMenu field={field} onUpdate={mockOnUpdate}>
        {({ onContextMenu }) => <button data-testid="child" onContextMenu={onContextMenu} />}
      </FieldOverrideContextMenu>,
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId('child'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Reset Override'));
    });

    expect(revertTypeOverride).toHaveBeenCalledWith(field, testMappingTree.namespaceMap, mockUpdateDocument);
    expect(mockOnUpdate).toHaveBeenCalled();

    // Clean up
    field.typeOverride = TypeOverrideVariant.NONE;
  });
});
