import { FieldItem, IfItem, ValueOfSelector } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  FieldItemNodeData,
  MappingNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import {
  rowNamed,
  rowsOf,
  rowWhere,
  selectHl7OrderChoiceObr,
  substituteCarForAbstractVehicle,
} from '../../stubs/datamapper/cardinality-test-helpers';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Deleting the mappings under a selected choice member or abstract substitute must keep the selection (#4158).
 * The delete removes the FieldItems it leaves empty, the one of the selected member included, so the selected
 * member row is drawn from the selection the document holds, not from a FieldItem.
 */
describe('MappingActionService — deleting the mappings under a selected wrapper member (#4158)', () => {
  /**
   * "Add value selector" on the row `findRow` returns, as in the issue. The row must be one the menu offers the
   * action on: a field without element children.
   */
  function addValueSelector(findRow: () => NodeData) {
    const row = findRow() as TargetNodeData;
    expect(MappingActionRegistryService.getAllowedActions(row)).toContain(MappingActionKind.ValueSelector);
    MappingActionService.applyValueOfSelector(row);

    const mappedRow = findRow();
    expect(mappedRow).toBeInstanceOf(FieldItemNodeData);
    expect((mappedRow as FieldItemNodeData).mapping.children.some((child) => child instanceof ValueOfSelector)).toBe(
      true,
    );
  }

  /** The delete of the empty value selector, drawn inline on the field row, so it is deleted from that row. */
  function deleteValueSelector(findRow: () => NodeData) {
    MappingActionService.deleteMappingItem(findRow() as TargetNodeData);
  }

  function addAndDeleteValueSelector(findRow: () => NodeData) {
    addValueSelector(findRow);
    deleteValueSelector(findRow);
  }

  /** The selected member is still drawn as the selection, with the children and the expand button it had. */
  function expectSelectedMemberRow(row: NodeData, childTitles: string[]) {
    expect(VisualizationUtilService.isUnselectedWrapperField(row)).toBe(false);
    expect(VisualizationService.hasChildren(row)).toBe(true);
    expect(rowsOf(row).map((child) => child.title)).toEqual(childTitles);
  }

  describe('the selected OBR member of the HL7 ORM_O01 ORDER_CHOICE', () => {
    const obrChildTitles = ['OBR.1', 'OBR.2', 'OBR.3', 'OBR.4'];

    it('should keep its children after the mapping of a field under it is deleted', () => {
      const { orderChoiceRow } = selectHl7OrderChoiceObr();

      addAndDeleteValueSelector(() => rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3'));

      expectSelectedMemberRow(rowNamed(orderChoiceRow(), 'OBR'), obrChildTitles);
    });

    it('should keep its children after the mapping of a nested leaf is deleted', () => {
      // OBR.4 is a composite, so mapping CE.1 puts an OBR.4 FieldItem the user did not create between the
      // mapping and OBR, and the delete cleans up more than one level.
      const { orderChoiceRow } = selectHl7OrderChoiceObr();
      const obr4Row = () => rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.4');
      const ce1Row = () => rowNamed(obr4Row(), 'CE.1');

      addValueSelector(ce1Row);
      expect(obr4Row()).toBeInstanceOf(FieldItemNodeData);
      expect(VisualizationUtilService.isChoiceWrapperMember(obr4Row())).toBe(false);
      deleteValueSelector(ce1Row);

      expectSelectedMemberRow(rowNamed(orderChoiceRow(), 'OBR'), obrChildTitles);
      expect(rowsOf(obr4Row()).map((child) => child.title)).toEqual(['CE.1', 'CE.2']);
    });

    it('should keep its children after an if wrapped around it is deleted', () => {
      const { orderChoiceRow } = selectHl7OrderChoiceObr();
      MappingActionService.applyIf(rowNamed(orderChoiceRow(), 'OBR') as TargetNodeData);
      const ifRow = rowWhere(
        orderChoiceRow(),
        (row) => row instanceof MappingNodeData && row.mapping instanceof IfItem,
        'for the if',
      );

      MappingActionService.deleteMappingItem(ifRow as TargetNodeData);

      expectSelectedMemberRow(rowNamed(orderChoiceRow(), 'OBR'), obrChildTitles);
    });

    it('should not write the emptied OBR, while the document keeps it selected', () => {
      const { tree, orderChoiceRow } = selectHl7OrderChoiceObr();

      addAndDeleteValueSelector(() => rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3'));

      const obrRow = rowNamed(orderChoiceRow(), 'OBR');
      expect(obrRow).toBeInstanceOf(TargetChoiceFieldNodeData);
      expect((obrRow as TargetChoiceFieldNodeData).choiceField).toBeDefined();
      expect((obrRow as TargetChoiceFieldNodeData).mapping).toBeUndefined();
      expect(tree.children.some((child) => child instanceof FieldItem)).toBe(false);
    });
  });

  describe('the selected Car substitute of AbstractVehicle', () => {
    it('should keep its children after the mapping of a field under it is deleted', () => {
      const { primaryRow } = substituteCarForAbstractVehicle();

      addAndDeleteValueSelector(() => rowNamed(rowNamed(primaryRow(), 'Car'), 'doors'));

      const carRow = rowNamed(primaryRow(), 'Car');
      expect(carRow).toBeInstanceOf(TargetAbstractFieldNodeData);
      expectSelectedMemberRow(carRow, ['model', 'doors']);
    });
  });
});
