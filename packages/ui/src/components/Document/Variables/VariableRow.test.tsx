import { fireEvent, render, screen, within } from '@testing-library/react';

import { DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import {
  FieldItem,
  ForEachItem,
  MappingTree,
  ValueOfSelector,
  VariableItem,
  VariableScope,
} from '../../../models/datamapper/mapping';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { MappingService } from '../../../services/mapping/mapping.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { VariableRow } from './VariableRow';

describe('VariableRow', () => {
  let mappingTree: MappingTree;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, 'target-doc', DocumentDefinitionType.XML_SCHEMA);
  });

  const createGlobalVariable = (name: string, scope: VariableScope = 'template', expression?: string) =>
    MappingService.addVariable(mappingTree, name, expression, scope);

  const renderRow = (
    variable: VariableItem,
    {
      isRenaming = false,
      isReadOnly = false,
      onStartRename = vi.fn(),
      onStopRename = vi.fn(),
      onDelete = vi.fn(),
    }: Partial<{
      isRenaming: boolean;
      isReadOnly: boolean;
      onStartRename: (id: string) => void;
      onStopRename: () => void;
      onDelete: (variable: VariableItem) => void;
    }> = {},
  ) =>
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <VariableRow
            variable={variable}
            isRenaming={isRenaming}
            isReadOnly={isReadOnly}
            onStartRename={onStartRename}
            onStopRename={onStopRename}
            onDelete={onDelete}
          />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );

  describe('scope hint', () => {
    it('shows "stylesheet" next to a stylesheet variable', () => {
      const variable = createGlobalVariable('rate', 'stylesheet');

      renderRow(variable);

      expect(screen.getByTestId('variable-row-rate')).toHaveTextContent('(stylesheet)');
    });

    it('shows no scope hint for a template variable', () => {
      const variable = createGlobalVariable('rate', 'template');

      renderRow(variable);

      expect(screen.getByTestId('variable-row-rate')).not.toHaveTextContent('(');
    });

    it('shows the field a node variable is defined in', () => {
      const document = TestUtil.createTargetOrderDoc();
      const shipOrderItem = MappingService.createFieldItem(mappingTree, document.fields[0]);
      const variable = MappingService.addVariable(shipOrderItem, 'rate');

      renderRow(variable);

      expect(screen.getByTestId('variable-row-rate')).toHaveTextContent(`(${document.fields[0].displayName})`);
    });

    it('shows the instruction a node variable is defined in', () => {
      const forEach = new ForEachItem(mappingTree);
      mappingTree.children.push(forEach);
      const variable = MappingService.addVariable(forEach, 'rate');

      renderRow(variable);

      expect(screen.getByTestId('variable-row-rate')).toHaveTextContent('(for-each)');
    });
  });

  describe('expression input', () => {
    it.each<VariableScope>(['template', 'stylesheet'])('offers the expression input for a %s variable', (scope) => {
      const variable = createGlobalVariable('rate', scope);

      renderRow(variable);

      expect(within(screen.getByTestId('variable-row-rate')).getByTestId('transformation-xpath-input')).toBeVisible();
    });

    it('does not offer the expression input for a node variable', () => {
      const forEach = new ForEachItem(mappingTree);
      mappingTree.children.push(forEach);
      const variable = MappingService.addVariable(forEach, 'rate');

      renderRow(variable);

      expect(screen.queryByTestId('transformation-xpath-input')).not.toBeInTheDocument();
    });

    it('does not offer the expression input in read-only mode', () => {
      const variable = createGlobalVariable('rate');

      renderRow(variable, { isReadOnly: true });

      expect(screen.queryByTestId('transformation-xpath-input')).not.toBeInTheDocument();
    });

    it('stores the typed expression on the variable', () => {
      const variable = createGlobalVariable('rate');
      renderRow(variable);

      fireEvent.change(screen.getByTestId('transformation-xpath-input'), { target: { value: '0.19' } });

      expect(variable.expression).toBe('0.19');
    });

    it('drops the preserved XSLT body of a variable once an expression is typed', () => {
      const variable = createGlobalVariable('rate', 'stylesheet');
      variable.rawElement = new DOMParser().parseFromString(
        '<xsl:variable xmlns:xsl="http://www.w3.org/1999/XSL/Transform" name="rate"><xsl:value-of select="1"/></xsl:variable>',
        'application/xml',
      ).documentElement;
      renderRow(variable);

      fireEvent.change(screen.getByTestId('transformation-xpath-input'), { target: { value: '0.19' } });

      expect(variable.rawElement).toBeUndefined();
    });
  });

  describe('rename', () => {
    it('starts renaming the variable on double-click of its title', () => {
      const variable = createGlobalVariable('rate');
      const onStartRename = vi.fn();
      renderRow(variable, { onStartRename });

      fireEvent.doubleClick(screen.getByText('$'));

      expect(onStartRename).toHaveBeenCalledWith(variable.id);
    });

    it('does not start renaming on double-click in read-only mode', () => {
      const variable = createGlobalVariable('rate');
      const onStartRename = vi.fn();
      renderRow(variable, { isReadOnly: true, onStartRename });

      fireEvent.doubleClick(screen.getByText('$'));

      expect(onStartRename).not.toHaveBeenCalled();
    });

    it('starts renaming the variable from the "Rename" context menu entry', () => {
      const variable = createGlobalVariable('rate');
      const onStartRename = vi.fn();
      renderRow(variable, { onStartRename });

      fireEvent.contextMenu(screen.getByTestId('variable-row-rate'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));

      expect(onStartRename).toHaveBeenCalledWith(variable.id);
      expect(screen.queryByRole('menuitem', { name: 'Rename' })).not.toBeInTheDocument();
    });

    it('does not open the context menu in read-only mode', () => {
      const variable = createGlobalVariable('rate');
      renderRow(variable, { isReadOnly: true });

      fireEvent.contextMenu(screen.getByTestId('variable-row-rate'));

      expect(screen.queryByRole('menuitem', { name: 'Rename' })).not.toBeInTheDocument();
    });

    it('shows the name input filled with the current name while renaming', () => {
      const variable = createGlobalVariable('rate');

      renderRow(variable, { isRenaming: true });

      expect(screen.getByTestId('new-variable-name-input')).toHaveValue('rate');
      expect(screen.queryByTestId('variable-row-rate')).not.toBeInTheDocument();
    });

    it('renames the variable and its references on confirm', () => {
      const document = TestUtil.createTargetOrderDoc();
      const variable = createGlobalVariable('rate');
      const fieldItem = new FieldItem(mappingTree, document.fields[0]);
      mappingTree.children.push(fieldItem);
      const valueSelector = new ValueOfSelector(fieldItem);
      valueSelector.expression = '$rate * 2';
      fieldItem.children.push(valueSelector);
      const onStopRename = vi.fn();
      renderRow(variable, { isRenaming: true, onStopRename });

      fireEvent.change(screen.getByTestId('new-variable-name-input'), { target: { value: 'taxRate' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      expect(variable.name).toBe('taxRate');
      expect(valueSelector.expression).toBe('$taxRate * 2');
      expect(onStopRename).toHaveBeenCalledTimes(1);
    });

    it('stops renaming without changing the name on cancel', () => {
      const variable = createGlobalVariable('rate');
      const onStopRename = vi.fn();
      renderRow(variable, { isRenaming: true, onStopRename });

      fireEvent.change(screen.getByTestId('new-variable-name-input'), { target: { value: 'taxRate' } });
      fireEvent.click(screen.getByTestId('new-variable-cancel-btn'));

      expect(variable.name).toBe('rate');
      expect(onStopRename).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('passes the variable to onDelete after the deletion is confirmed', () => {
      const variable = createGlobalVariable('rate');
      const onDelete = vi.fn();
      renderRow(variable, { onDelete });

      fireEvent.click(screen.getByTestId('delete-variable-rate-button'));
      fireEvent.click(screen.getByTestId('delete-variable-rate-modal-confirm-btn'));

      expect(onDelete).toHaveBeenCalledWith(variable);
    });

    it('does not offer the delete button in read-only mode', () => {
      const variable = createGlobalVariable('rate');

      renderRow(variable, { isReadOnly: true });

      expect(screen.queryByTestId('delete-variable-rate-button')).not.toBeInTheDocument();
    });
  });
});
