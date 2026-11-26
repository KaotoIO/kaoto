import { DocumentType, IField } from '../../models/datamapper/document';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  FieldItemNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import {
  createTargetTree,
  documentRows,
  NS_HL7_V2,
  NS_SUBSTITUTION,
  ORM_O01,
  parseXsdDocument,
  rowNamed,
  rowWhere,
} from '../../stubs/datamapper/cardinality-test-helpers';
import { getFieldSubstitutionXsd, getHl7OrmOrderChoiceXsd } from '../../stubs/datamapper/data-mapper';
import { MappingService } from '../mapping/mapping.service';
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
      const doc = parseXsdDocument(
        DocumentType.TARGET_BODY,
        'Hl7OrmOrderChoice.xsd',
        getHl7OrmOrderChoiceXsd(),
        ORM_O01,
      );
      const tree = createTargetTree(doc, { hl7: NS_HL7_V2 });
      const orderChoiceRow = () =>
        rowNamed(
          rowNamed(rowNamed(documentRows(doc, tree)[0], 'ORM_O01.ORDER'), 'ORM_O01.ORDER_DETAIL'),
          'ORM_O01.ORDER_CHOICE',
        );

      const choiceRow = rowWhere(orderChoiceRow(), (row) => row instanceof TargetChoiceFieldNodeData, 'for the choice');
      const choiceWrapper = VisualizationUtilService.getField(choiceRow) as IField;
      const obrIndex = choiceWrapper.fields.findIndex((member) => member.name === 'OBR');
      ChoiceFieldService.dispatchChoiceSelection(
        choiceRow,
        choiceWrapper,
        { memberIndex: obrIndex },
        tree.namespaceMap,
        true,
      );
      MappingService.removeStaleMappingsForDocument(tree, doc);

      addValueSelector(rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3'));
      return rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3');
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
    const namespaceMap = { sub: NS_SUBSTITUTION };

    function selectCarAndMapDoors(): NodeData {
      const doc = parseXsdDocument(DocumentType.TARGET_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd(), {
        namespaceUri: NS_SUBSTITUTION,
        name: 'Zoo',
      });
      const tree = createTargetTree(doc, namespaceMap);
      const primaryRow = () => rowNamed(rowNamed(documentRows(doc, tree)[0], 'Equipment'), 'Primary');

      const vehicleRow = rowWhere(
        primaryRow(),
        (row) => row instanceof TargetAbstractFieldNodeData,
        'for AbstractVehicle',
      );
      const vehicleWrapper = VisualizationUtilService.getField(vehicleRow) as IField;
      AbstractFieldService.applyAbstractSubstitution(
        vehicleRow,
        vehicleWrapper,
        'sub:Car',
        {},
        vehicleWrapper,
        tree.namespaceMap,
        true,
      );
      MappingService.removeStaleMappingsForDocument(tree, doc);

      addValueSelector(rowNamed(rowNamed(primaryRow(), 'Car'), 'doors'));
      return rowNamed(rowNamed(primaryRow(), 'Car'), 'doors');
    }

    it('should not be taken for an abstract wrapper member', () => {
      const doorsRow = selectCarAndMapDoors();

      expect(doorsRow).toBeInstanceOf(FieldItemNodeData);
      expect(VisualizationUtilService.isAbstractWrapperMember(doorsRow)).toBe(false);
    });

    it('should offer no substitution menu actions', () => {
      const info = AbstractFieldService.resolveInfo(selectCarAndMapDoors(), namespaceMap);

      expect(info.isAbstractWrapper).toBe(false);
      expect(info.isAbstractWrapperMember).toBe(false);
      expect(info.isSelectedSubstitution).toBe(false);
      expect(info.isSubstitutionCandidate).toBe(false);
      expect(info.abstractWrapperField).toBeUndefined();
    });
  });
});
