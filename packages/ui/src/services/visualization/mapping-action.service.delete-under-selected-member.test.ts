import { DocumentType, IField } from '../../models/datamapper/document';
import { FieldItem, ValueOfSelector } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  FieldItemNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetFieldNodeData,
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
  rowsOf,
  rowWhere,
} from '../../stubs/datamapper/cardinality-test-helpers';
import { getFieldSubstitutionXsd, getHl7OrmOrderChoiceXsd } from '../../stubs/datamapper/data-mapper';
import { MappingService } from '../mapping/mapping.service';
import { AbstractFieldService } from './abstract-field.service';
import { ChoiceFieldService } from './choice-field.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Deleting the last mapping under a selected choice member or abstract substitute must keep the selection (#4158).
 * The selection is held by a user-created FieldItem; the delete used to cascade through it and remove the whole
 * FieldItem chain, so the selected row was left without a FieldItem and showed no children.
 */
describe('MappingActionService — deleting the last mapping under a selected wrapper member (#4158)', () => {
  /**
   * "Add value selector" on the row `findRow` returns, then the delete of that empty value selector, as in the issue.
   * The row must be one the menu offers the action on: a field without element children. The value selector is
   * drawn inline on the field row, so it is deleted from that row.
   */
  function addAndDeleteValueSelector(findRow: () => NodeData) {
    const row = findRow() as TargetNodeData;
    expect(MappingActionRegistryService.getAllowedActions(row)).toContain(MappingActionKind.ValueSelector);
    MappingActionService.applyValueOfSelector(row);

    const mappedRow = findRow();
    expect(mappedRow).toBeInstanceOf(FieldItemNodeData);
    const mappedItem = (mappedRow as FieldItemNodeData).mapping;
    expect(mappedItem.children.some((child) => child instanceof ValueOfSelector)).toBe(true);
    MappingActionService.deleteMappingItem(mappedRow as TargetNodeData);
  }

  /** The selected member keeps the FieldItem that holds the selection, and with it the children it shows. */
  function expectSelectedMemberRow(row: NodeData, childTitles: string[]) {
    expect((row as TargetFieldNodeData).mapping).toBeInstanceOf(FieldItem);
    expect(VisualizationService.hasChildren(row)).toBe(true);
    expect(rowsOf(row).map((child) => child.title)).toEqual(childTitles);
  }

  it('should keep the OBR selection of the HL7 ORM_O01 ORDER_CHOICE and its children', () => {
    const doc = parseXsdDocument(DocumentType.TARGET_BODY, 'Hl7OrmOrderChoice.xsd', getHl7OrmOrderChoiceXsd(), ORM_O01);
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

    addAndDeleteValueSelector(() => rowNamed(rowNamed(orderChoiceRow(), 'OBR'), 'OBR.3'));

    expectSelectedMemberRow(rowNamed(orderChoiceRow(), 'OBR'), ['OBR.1', 'OBR.2', 'OBR.3', 'OBR.4']);
  });

  it('should keep the Car substitute of AbstractVehicle and its children', () => {
    const doc = parseXsdDocument(DocumentType.TARGET_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd(), {
      namespaceUri: NS_SUBSTITUTION,
      name: 'Zoo',
    });
    const tree = createTargetTree(doc, { sub: NS_SUBSTITUTION });
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

    addAndDeleteValueSelector(() => rowNamed(rowNamed(primaryRow(), 'Car'), 'doors'));

    expectSelectedMemberRow(rowNamed(primaryRow(), 'Car'), ['model', 'doors']);
  });
});
