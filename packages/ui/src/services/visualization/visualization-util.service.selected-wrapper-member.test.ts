import { MappingActionKind } from '../../models/datamapper/mapping-action';
import { FieldItemNodeData, NodeData, TargetNodeData } from '../../models/datamapper/visualization';
import {
  rowNamed,
  selectHl7OrderChoiceObr,
  substituteCarForAbstractVehicle,
} from '../../stubs/datamapper/cardinality-test-helpers';
import { AbstractFieldService } from './abstract-field.service';
import { ChoiceFieldService } from './choice-field.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * A child of a selected choice member or abstract substitute is an ordinary element. Once it gets a mapping it is
 * drawn as a FieldItemNodeData under the selected member's row, and it must not be taken for a member of the
 * wrapper: no wrapper member icon, no choice or substitution menu (#4158).
 */
describe('VisualizationUtilService — children of a selected wrapper member (#4158)', () => {
  /** "Add value selector" on `row`, which must be one the menu offers it on: a field without element children. */
  function addValueSelector(row: NodeData) {
    expect(MappingActionRegistryService.getAllowedActions(row as TargetNodeData)).toContain(
      MappingActionKind.ValueSelector,
    );
    MappingActionService.applyValueOfSelector(row as TargetNodeData);
  }

  describe('a child of the selected OBR member of the HL7 ORM_O01 ORDER_CHOICE', () => {
    function selectObrAndMapObr3(): NodeData {
      const { orderChoiceRow } = selectHl7OrderChoiceObr();
      const obr3Row = () => rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3');
      addValueSelector(obr3Row());
      return obr3Row();
    }

    it('should not be taken for a choice wrapper member', () => {
      const obr3Row = selectObrAndMapObr3();

      expect(obr3Row).toBeInstanceOf(FieldItemNodeData);
      expect(VisualizationUtilService.isChoiceWrapperMember(obr3Row)).toBe(false);
    });

    it('should offer no choice menu actions', () => {
      const info = ChoiceFieldService.resolveInfo(selectObrAndMapObr3());

      expect(info.isChoiceWrapper).toBe(false);
      expect(info.isSelectedChoice).toBe(false);
      expect(info.isChoiceMember).toBe(false);
      expect(info.isChoiceWrapperMember).toBe(false);
      expect(info.effectiveChoiceWrapper).toBeUndefined();
    });
  });

  describe('a child of the selected Car substitute of AbstractVehicle', () => {
    function selectCarAndMapDoors(): { doorsRow: NodeData; namespaceMap: Record<string, string> } {
      const { tree, primaryRow } = substituteCarForAbstractVehicle();
      const doorsRow = () => rowNamed(rowNamed(primaryRow(), 'Car'), 'doors');
      addValueSelector(doorsRow());
      return { doorsRow: doorsRow(), namespaceMap: tree.namespaceMap };
    }

    it('should not be taken for an abstract wrapper member', () => {
      const { doorsRow } = selectCarAndMapDoors();

      expect(doorsRow).toBeInstanceOf(FieldItemNodeData);
      expect(VisualizationUtilService.isAbstractWrapperMember(doorsRow)).toBe(false);
    });

    it('should offer no substitution menu actions', () => {
      const { doorsRow, namespaceMap } = selectCarAndMapDoors();
      const info = AbstractFieldService.resolveInfo(doorsRow, namespaceMap);

      expect(info.isAbstractWrapper).toBe(false);
      expect(info.isAbstractWrapperMember).toBe(false);
      expect(info.isSelectedSubstitution).toBe(false);
      expect(info.isSubstitutionCandidate).toBe(false);
      expect(info.abstractWrapperField).toBeUndefined();
    });
  });
});
