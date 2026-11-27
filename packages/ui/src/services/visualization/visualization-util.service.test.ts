import { DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper/document';
import { FieldCardinality, Occurrence } from '../../models/datamapper/field-cardinality';
import { CopyOfSelector, FieldItem, ForEachItem, MappingTree } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  SequenceFieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import {
  createTargetTree,
  descendantRow,
  documentRows,
  findField,
  forEachRow,
  NOTIFICATION,
  NS_CHOICE_ABSTRACT,
  NS_POC,
  NS_SUBSTITUTION,
  parseXsdDocument,
  repeatingChoiceOf,
  rowNamed,
  rowWhere,
  selectFirstChoiceMember,
} from '../../stubs/datamapper/cardinality-test-helpers';
import {
  getChoiceRepeatingAbstractCatXslt,
  getChoiceRepeatingAbstractXsd,
  getChoiceRepeatingContainerMemberXsd,
  getChoiceRepeatingMemberXsd,
  getChoiceWithAbstractXsd,
  getFieldSubstitutionXsd,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { createGuardedCsvCopyOfRow } from '../../stubs/datamapper/target-render-test-helpers';
import { MaxOccursType } from '../../xml-schema-ts/constants';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationUtilService } from './visualization-util.service';

function createMockField(baseField: IField, overrides: Partial<IField> = {}): IField {
  return { ...baseField, ...overrides };
}

describe('VisualizationUtilService', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
  });

  describe('isChoiceField', () => {
    it('should return true for ChoiceFieldNodeData', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [
          { ...sourceDoc.fields[0], name: 'email' },
          { ...sourceDoc.fields[0], name: 'phone' },
        ],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceField(choiceNode)).toBe(true);
    });

    it('should return true for TargetChoiceFieldNodeData', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [
          { ...sourceDoc.fields[0], name: 'email' },
          { ...sourceDoc.fields[0], name: 'phone' },
        ],
      } as unknown as IField;
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceField(choiceNode)).toBe(true);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isChoiceField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isChoiceField(sourceDocNode)).toBe(false);
    });
  });

  describe('isAbstractField', () => {
    it('should return true for AbstractFieldNodeData', () => {
      const abstractField = {
        ...sourceDoc.fields[0],
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        isAbstract: true,
        substitutionGroup: [
          { ...sourceDoc.fields[0], name: 'Cat' },
          { ...sourceDoc.fields[0], name: 'Dog' },
        ],
      } as unknown as IField;
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
    });

    it('should return true for TargetAbstractFieldNodeData', () => {
      const abstractField = {
        ...sourceDoc.fields[0],
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        isAbstract: true,
        substitutionGroup: [
          { ...sourceDoc.fields[0], name: 'Cat' },
          { ...sourceDoc.fields[0], name: 'Dog' },
        ],
      } as unknown as IField;
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAbstractField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isAbstractField(sourceDocNode)).toBe(false);
    });
  });

  describe('isCollectionField', () => {
    it('should return false for non-collection FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isCollectionField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isCollectionField(sourceDocNode)).toBe(false);
    });

    it('should return true for selected abstract field when wrapper is collection', () => {
      const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
      const wrapper = findField(doc, 'AbstractAnimal');
      expect(wrapper.maxOccurs).toBe('unbounded');
      FieldOverrideService.applyFieldSubstitution(wrapper, 'ns0:Dog', { ns0: NS_SUBSTITUTION });

      const dogRow = rowNamed(documentRows(doc)[0], 'Dog');
      expect(dogRow).toBeInstanceOf(AbstractFieldNodeData);
      expect((dogRow as AbstractFieldNodeData).abstractField).toBe(wrapper);
      expect(VisualizationUtilService.isCollectionField(dogRow)).toBe(true);
    });

    it('should return false for selected abstract field when wrapper is not collection', () => {
      const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
      const wrapper = findField(doc, 'AbstractLabel');
      expect(wrapper.maxOccurs).toBe(1);
      FieldOverrideService.applyFieldSubstitution(wrapper, 'ns0:Nickname', { ns0: NS_SUBSTITUTION });

      const nicknameRow = rowNamed(documentRows(doc)[0], 'Nickname');
      expect((nicknameRow as AbstractFieldNodeData).abstractField).toBe(wrapper);
      expect(VisualizationUtilService.isCollectionField(nicknameRow)).toBe(false);
    });

    it('should return true for a selected sequence branch when the enclosing choice is a collection', () => {
      const doc = parseXsdDocument(
        DocumentType.SOURCE_BODY,
        'ChoiceRepeatingAbstract.xsd',
        getChoiceRepeatingAbstractXsd(),
      );
      const container = findField(doc, 'SequenceInRepeatingChoice');
      const choice = findField(container, '__choice__');
      const sequence = findField(choice, '__sequence__');
      expect(sequence.maxOccurs).toBe(1);
      WrapperSelectionService.setChoiceSelection(doc, choice, 0, { ns0: NS_POC });

      const sequenceRow = rowWhere(
        rowNamed(documentRows(doc)[0], 'SequenceInRepeatingChoice'),
        (row) => row instanceof SequenceFieldNodeData,
        'for the selected sequence branch',
      );
      expect(VisualizationUtilService.getSelectedChoiceWrapper(sequenceRow)).toBe(choice);
      expect(VisualizationUtilService.isCollectionField(sequenceRow)).toBe(true);
    });

    it('should return false for a selected sequence branch when the enclosing choice is not a collection', () => {
      const doc = parseXsdDocument(
        DocumentType.SOURCE_BODY,
        'ChoiceRepeatingAbstract.xsd',
        getChoiceRepeatingAbstractXsd(),
      );
      const choice = findField(findField(doc, 'SequenceInSingleChoice'), '__choice__');
      WrapperSelectionService.setChoiceSelection(doc, choice, 0, { ns0: NS_POC });

      const sequenceRow = rowWhere(
        rowNamed(documentRows(doc)[0], 'SequenceInSingleChoice'),
        (row) => row instanceof SequenceFieldNodeData,
        'for the selected sequence branch',
      );
      expect(VisualizationUtilService.getSelectedChoiceWrapper(sequenceRow)).toBe(choice);
      expect(VisualizationUtilService.isCollectionField(sequenceRow)).toBe(false);
    });

    it('should return true for a source child of a sequence branch inside a collection choice', () => {
      // choice(unbounded) > sequence(1) > key(1): on the source side the child is a plain
      // FieldNodeData whose collection status comes from DocumentService walking up the
      // transparent sequence compositor to the repeating choice.
      const choiceWrapper = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        maxOccurs: 'unbounded',
        wrapperKind: 'choice',
      });
      const sequenceField = createMockField(sourceDoc.fields[0], {
        name: '__sequence__',
        maxOccurs: 1,
        wrapperKind: 'sequence',
        parent: choiceWrapper,
      });
      const keyField = createMockField(sourceDoc.fields[0], { name: 'key', maxOccurs: 1, parent: sequenceField });
      const seqNode = new SequenceFieldNodeData(sourceDocNode, sequenceField);
      seqNode.choiceField = choiceWrapper;
      const keyNode = new FieldNodeData(seqNode, keyField);
      expect(VisualizationUtilService.isCollectionField(keyNode)).toBe(true);
    });
  });

  describe('getCardinality on parsed schemas', () => {
    const abstractDoc = (documentType: DocumentType) =>
      parseXsdDocument(documentType, 'ChoiceRepeatingAbstract.xsd', getChoiceRepeatingAbstractXsd());
    const cardinality = (ownMin: number, ownMax: MaxOccursType, effMin: number, effMax: MaxOccursType) =>
      new FieldCardinality(new Occurrence(ownMin, ownMax), new Occurrence(effMin, effMax));

    describe('a repeating member of a non-repeating choice', () => {
      it('should read the selected member as a collection', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        const itemRow = rowNamed(documentRows(doc, tree)[0], 'Item');

        expect(VisualizationUtilService.isCollectionField(itemRow)).toBe(true);
        expect(VisualizationUtilService.getCardinality(itemRow)).toEqual(cardinality(1, 'unbounded', 0, 'unbounded'));
      });

      it('should still read the member as a collection after "Wrap with for-each"', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        MappingActionService.applyForEach(rowNamed(documentRows(doc, tree)[0], 'Item') as TargetFieldNodeData);

        const wrappedItemRow = rowNamed(forEachRow(documentRows(doc, tree)[0]), 'Item');
        expect(wrappedItemRow).toBeInstanceOf(FieldItemNodeData);
        expect(VisualizationUtilService.isCollectionField(wrappedItemRow)).toBe(true);
      });

      it('should not read a child of the selected member as a collection', () => {
        const { doc, tree } = selectFirstChoiceMember(
          'ChoiceRepeatingContainerMember.xsd',
          getChoiceRepeatingContainerMemberXsd(),
        );
        const nameRow = rowNamed(rowNamed(documentRows(doc, tree)[0], 'Item'), 'Name');

        expect(VisualizationUtilService.isCollectionField(nameRow)).toBe(false);
      });
    });

    describe('a repeating abstract wrapper in a non-repeating choice', () => {
      it('should read the wrapper row and its target member rows as collections', () => {
        const doc = abstractDoc(DocumentType.TARGET_BODY);
        const tree = createTargetTree(doc, { ns0: NS_POC });
        MappingSerializerService.deserialize(
          getChoiceRepeatingAbstractCatXslt(),
          doc,
          tree,
          TestUtil.createParameterMap(),
        );
        const containerRow = rowNamed(documentRows(doc, tree)[0], 'AbstractInChoice');
        const wrapperRow = rowWhere(containerRow, (row) => row instanceof TargetAbstractFieldNodeData, 'for Animal');
        const catRow = rowNamed(wrapperRow, 'Cat');
        const dogRow = rowNamed(wrapperRow, 'Dog');

        expect(catRow).toBeInstanceOf(FieldItemNodeData);
        expect(VisualizationUtilService.isCollectionField(wrapperRow)).toBe(true);
        expect(VisualizationUtilService.isCollectionField(catRow)).toBe(true);
        expect(VisualizationUtilService.isCollectionField(dogRow)).toBe(true);
      });

      it('should read a source candidate row of the unselected wrapper as a collection', () => {
        const doc = abstractDoc(DocumentType.SOURCE_BODY);
        const containerRow = rowNamed(documentRows(doc)[0], 'AbstractInChoice');
        const wrapperRow = descendantRow(containerRow, (row) => row instanceof AbstractFieldNodeData, 'for Animal');

        expect(VisualizationUtilService.isCollectionField(rowNamed(wrapperRow, 'Dog'))).toBe(true);
      });
    });

    it('should read a source candidate row of an unselected repeating abstract wrapper as a collection', () => {
      const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
      const wrapperRow = descendantRow(
        documentRows(doc)[0],
        (row) => row instanceof AbstractFieldNodeData && row.field.name === 'AbstractAnimal',
        'for AbstractAnimal',
      );

      expect(VisualizationUtilService.isCollectionField(rowNamed(wrapperRow, 'Dog'))).toBe(true);
    });

    it('should read a source candidate row of a non-repeating abstract wrapper in a repeating choice as a collection', () => {
      const doc = parseXsdDocument(
        DocumentType.SOURCE_BODY,
        'ChoiceWithAbstract.xsd',
        getChoiceWithAbstractXsd(),
        NOTIFICATION,
      );
      const repeatingChoice = repeatingChoiceOf(findField(doc, 'Short'));
      const abstractMessage = findField(repeatingChoice, 'AbstractMessage');
      expect(abstractMessage.maxOccurs).toBe(1);

      const emailField = findField(abstractMessage, 'Email');
      const emailRow = new FieldNodeData(
        new AbstractFieldNodeData(new DocumentNodeData(doc), abstractMessage),
        emailField,
      );
      expect(VisualizationUtilService.isCollectionField(emailRow)).toBe(true);
    });

    it('should read the candidate rows under a reverted wrapper field item inside a for-each as collections', () => {
      const doc = parseXsdDocument(
        DocumentType.TARGET_BODY,
        'ChoiceWithAbstract.xsd',
        getChoiceWithAbstractXsd(),
        NOTIFICATION,
      );
      const shortField = findField(doc, 'Short');
      const abstractMessage = findField(repeatingChoiceOf(shortField), 'AbstractMessage');
      const tree = createTargetTree(doc, { ns0: NS_CHOICE_ABSTRACT });
      const notificationItem = new FieldItem(tree, doc.fields[0]);
      tree.children.push(notificationItem);
      const shortItem = new FieldItem(notificationItem, shortField);
      notificationItem.children.push(shortItem);
      const forEach = new ForEachItem(shortItem);
      shortItem.children.push(forEach);
      forEach.children.push(new FieldItem(forEach, abstractMessage));

      const wrapperItemRow = rowWhere(
        forEachRow(rowNamed(documentRows(doc, tree)[0], 'Short')),
        (row) => row instanceof FieldItemNodeData && row.field === abstractMessage,
        'for the AbstractMessage field item',
      );
      expect(VisualizationUtilService.isCollectionField(rowNamed(wrapperItemRow, 'Email'))).toBe(true);
      expect(VisualizationUtilService.isCollectionField(rowNamed(wrapperItemRow, 'SMS'))).toBe(true);
    });

    it('should keep reading the rows of a non-repeating abstract wrapper in a repeating choice as collections', () => {
      const doc = parseXsdDocument(
        DocumentType.TARGET_BODY,
        'ChoiceWithAbstract.xsd',
        getChoiceWithAbstractXsd(),
        NOTIFICATION,
      );
      const abstractMessage = findField(repeatingChoiceOf(findField(doc, 'Short')), 'AbstractMessage');
      const emailField = findField(abstractMessage, 'Email');
      const shortRow = new TargetFieldNodeData(
        new TargetDocumentNodeData(doc, createTargetTree(doc, { ns0: NS_CHOICE_ABSTRACT })),
        findField(doc, 'Short'),
      );
      const wrapperRow = new TargetAbstractFieldNodeData(shortRow, abstractMessage);
      const memberRow = new TargetFieldNodeData(wrapperRow, emailField);
      const selectedRow = new TargetAbstractFieldNodeData(shortRow, emailField);
      selectedRow.abstractField = abstractMessage;

      expect(VisualizationUtilService.isCollectionField(wrapperRow)).toBe(true);
      expect(VisualizationUtilService.isCollectionField(memberRow)).toBe(true);
      expect(VisualizationUtilService.isCollectionField(selectedRow)).toBe(true);
    });

    it('should keep reading a mapped row under a repeating sequence branch of a non-repeating choice as a collection', () => {
      const doc = abstractDoc(DocumentType.TARGET_BODY);
      const container = findField(doc, 'AbstractInSequenceInChoice');
      const choice = findField(container, '__choice__');
      const catField = findField(findField(findField(choice, '__sequence__'), 'Animal'), 'Cat');
      const tree = createTargetTree(doc, { ns0: NS_POC });
      const rootItem = new FieldItem(tree, doc.fields[0]);
      tree.children.push(rootItem);
      const containerItem = new FieldItem(rootItem, container);
      rootItem.children.push(containerItem);
      containerItem.children.push(new FieldItem(containerItem, catField));

      const catRow = descendantRow(
        rowNamed(documentRows(doc, tree)[0], 'AbstractInSequenceInChoice'),
        (row) => row instanceof FieldItemNodeData && row.field === catField,
        'for the mapped Cat',
      );
      const wrapperField = (catRow as FieldItemNodeData).wrapperField;
      expect(wrapperField?.wrapperKind).toBe('abstract');
      expect(wrapperField?.maxOccurs).toBe(1);
      expect(VisualizationUtilService.isCollectionField(catRow)).toBe(true);
    });

    it('should multiply the bounds when two levels repeat', () => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const containerRow = rowNamed(documentRows(doc)[0], 'NestedRepeat');
      const choice = findField(findField(doc, 'NestedRepeat'), '__choice__');
      const aField = findField(choice, 'A');
      const aRow = new FieldNodeData(containerRow, aField);

      expect(VisualizationUtilService.getCardinality(aRow)).toEqual(cardinality(1, 1, 0, 'unbounded'));
    });

    it('should multiply a member bound with the repeating choice', () => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const bounded = findField(findField(doc, 'BoundedChoice'), 'Bounded');
      const boundedRow = new FieldNodeData(rowNamed(documentRows(doc)[0], 'BoundedChoice'), bounded);

      expect(VisualizationUtilService.getCardinality(boundedRow)).toEqual(cardinality(1, 5, 0, 15));
    });

    it.each([
      ['OptionalMemberInRequiredChoice', 'Optional', cardinality(0, 1, 0, 'unbounded')],
      ['RequiredMemberInOptionalChoice', 'Required', cardinality(1, 1, 0, 'unbounded')],
    ])('should give the own and the effective occurrence of %s/%s', (containerName, memberName, expected) => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const member = findField(findField(doc, containerName), memberName);
      const memberRow = new FieldNodeData(rowNamed(documentRows(doc)[0], containerName), member);

      expect(VisualizationUtilService.getCardinality(memberRow)).toEqual(expected);
    });

    describe('copy-of rows', () => {
      it('should read a bare copy-of row on a repeating field as a collection', () => {
        const doc = TestUtil.createTargetOrderDoc();
        const tree = createTargetTree(doc, { ns0: NS_POC });
        const shipOrderItem = new FieldItem(tree, doc.fields[0]);
        tree.children.push(shipOrderItem);
        const copyOf = new CopyOfSelector(shipOrderItem);
        copyOf.expression = '/ns0:ShipOrder/Item';
        shipOrderItem.children.push(copyOf);
        const row = rowWhere(documentRows(doc, tree)[0], (r) => r instanceof CopyOfFieldNodeData, 'for the copy-of');

        expect(VisualizationUtilService.getField(row)?.name).toBe('Item');
        expect(VisualizationUtilService.isCollectionField(row)).toBe(true);
      });

      it('should read a guarded copy-of row on a repeating field as a collection', () => {
        const row = createGuardedCsvCopyOfRow();
        expect(row.autoOptionalIfItem).toBeDefined();
        expect(Occurrence.isCollection(row.field)).toBe(true);
        expect(VisualizationUtilService.isCollectionField(row)).toBe(true);
      });

      it('should read a copy-of row on a candidate of a wrapper in a repeating choice as a collection', () => {
        const doc = parseXsdDocument(
          DocumentType.TARGET_BODY,
          'ChoiceWithAbstract.xsd',
          getChoiceWithAbstractXsd(),
          NOTIFICATION,
        );
        const abstractMessage = findField(repeatingChoiceOf(findField(doc, 'Short')), 'AbstractMessage');
        const emailField = findField(abstractMessage, 'Email');
        const tree = createTargetTree(doc, { ns0: NS_CHOICE_ABSTRACT });
        const notificationItem = new FieldItem(tree, doc.fields[0]);
        tree.children.push(notificationItem);
        const copyOf = new CopyOfSelector(notificationItem);
        copyOf.expression = '/ns0:Notification/ns0:Short/ns0:Email';
        notificationItem.children.push(copyOf);
        const copyOfRow = new CopyOfFieldNodeData(new TargetDocumentNodeData(doc, tree), copyOf, emailField);

        expect(VisualizationUtilService.isCollectionField(copyOfRow)).toBe(true);
      });
    });

    it('should return no cardinality for a node without a field', () => {
      expect(VisualizationUtilService.getCardinality(sourceDocNode)).toBeUndefined();
      expect(VisualizationUtilService.isCollectionField(sourceDocNode)).toBe(false);
    });

    it('should keep the add-mapping placeholder row out of the collection answer', () => {
      const itemField = findField(targetDoc, 'Item');
      const placeholder = new AddMappingNodeData(targetDocNode, itemField);
      expect(VisualizationUtilService.isCollectionField(placeholder)).toBe(false);
    });
  });

  describe('isSequenceNode', () => {
    it('should return true for a SequenceFieldNodeData', () => {
      const sequenceField = createMockField(sourceDoc.fields[0], { name: '__sequence__', wrapperKind: 'sequence' });
      const sequenceNode = new SequenceFieldNodeData(sourceDocNode, sequenceField);
      expect(VisualizationUtilService.isSequenceNode(sequenceNode)).toBe(true);
    });

    it('should return true for a per-instance FieldItemNodeData whose field is a sequence', () => {
      // A repeating (maxOccurs>1) choice renders its selected sequence branch as a FieldItemNodeData
      // (not a SequenceFieldNodeData), so it must still be recognised as a sequence for the badge.
      const sequenceField = createMockField(targetDoc.fields[0], { name: '__sequence__', wrapperKind: 'sequence' });
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sequenceField);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isSequenceNode(fieldItemNode)).toBe(true);
    });

    it('should return false for a non-sequence FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isSequenceNode(fieldNode)).toBe(false);
    });

    it('should return false for a document node', () => {
      expect(VisualizationUtilService.isSequenceNode(sourceDocNode)).toBe(false);
    });
  });

  describe('isAttributeField', () => {
    it('should return true for FieldNodeData with attribute field', () => {
      const attrField = { ...sourceDoc.fields[0], isAttribute: true } as unknown as IField;
      const fieldNode = new FieldNodeData(sourceDocNode, attrField);
      expect(VisualizationUtilService.isAttributeField(fieldNode)).toBe(true);
    });

    it('should return false for FieldNodeData with non-attribute field', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAttributeField(fieldNode)).toBe(false);
    });

    it('should return true for FieldItemNodeData with attribute field', () => {
      const attrField = { ...sourceDoc.fields[0], isAttribute: true } as unknown as IField;
      const fieldItem = new FieldItem(targetDocNode.mappingTree, attrField);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAttributeField(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData with non-attribute field', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAttributeField(fieldItemNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isAttributeField(sourceDocNode)).toBe(false);
    });
  });

  describe('isRecursiveField', () => {
    it('should return false for non-recursive FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isRecursiveField(fieldNode)).toBe(false);
    });

    it('should return false for non-recursive FieldItemNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isRecursiveField(fieldItemNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isRecursiveField(sourceDocNode)).toBe(false);
    });
  });

  describe('getField', () => {
    it('should return field for FieldNodeData', () => {
      const field = sourceDoc.fields[0];
      const fieldNode = new FieldNodeData(sourceDocNode, field);
      expect(VisualizationUtilService.getField(fieldNode)).toBe(field);
    });

    it('should return field for FieldItemNodeData', () => {
      const field = sourceDoc.fields[0];
      const fieldItem = new FieldItem(targetDocNode.mappingTree, field);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.getField(fieldItemNode)).toBe(field);
    });

    it('should return undefined for DocumentNodeData', () => {
      expect(VisualizationUtilService.getField(sourceDocNode)).toBeUndefined();
    });
  });

  describe('getSelectedChoiceDepth', () => {
    it('should return 0 for non-choice nodes', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.getSelectedChoiceDepth(fieldNode)).toBe(0);
    });

    it('should return 0 for unselected choice nodes', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        wrapperKind: 'choice' as const,
        fields: [],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(0);
    });

    it('should return 1 for simple selected choice', () => {
      const wrapper = {
        ...sourceDoc.fields[0],
        wrapperKind: 'choice' as const,
        selectedMemberIndex: 0,
        fields: [{ ...sourceDoc.fields[0], name: 'a', fields: [] }],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      choiceNode.choiceField = wrapper;
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(1);
    });

    it('should return 3 for triple-nested selected choice', () => {
      const outermost = createMockField(sourceDoc.fields[0], { wrapperKind: 'choice' });
      const middle = createMockField(sourceDoc.fields[0], { wrapperKind: 'choice', parent: outermost });
      const inner = createMockField(sourceDoc.fields[0], {
        wrapperKind: 'choice',
        selectedMemberIndex: 0,
        parent: middle,
      });
      middle.fields = [inner];
      middle.selectedMemberIndex = 0;
      outermost.fields = [middle];
      outermost.selectedMemberIndex = 0;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      choiceNode.choiceField = inner;
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(3);
    });
  });

  describe('isUnselectedWrapperField', () => {
    it('should return true for an unselected choice or abstract wrapper', () => {
      const choiceField = createMockField(sourceDoc.fields[0], { name: '__choice__', wrapperKind: 'choice' });
      const abstractField = createMockField(sourceDoc.fields[0], { name: 'AbstractAnimal', wrapperKind: 'abstract' });
      expect(
        VisualizationUtilService.isUnselectedWrapperField(new TargetChoiceFieldNodeData(targetDocNode, choiceField)),
      ).toBe(true);
      expect(
        VisualizationUtilService.isUnselectedWrapperField(
          new TargetAbstractFieldNodeData(targetDocNode, abstractField),
        ),
      ).toBe(true);
    });

    it('should return false for a selected choice member and for a regular field', () => {
      const choiceField = createMockField(sourceDoc.fields[0], { name: '__choice__', wrapperKind: 'choice' });
      const memberField = createMockField(sourceDoc.fields[0], { name: 'Email', parent: choiceField });
      const memberNode = new TargetChoiceFieldNodeData(targetDocNode, memberField);
      memberNode.choiceField = choiceField;
      expect(VisualizationUtilService.isUnselectedWrapperField(memberNode)).toBe(false);
      expect(
        VisualizationUtilService.isUnselectedWrapperField(new FieldNodeData(sourceDocNode, sourceDoc.fields[0])),
      ).toBe(false);
    });
  });

  describe('isAbstractWrapperMember', () => {
    it('should return true for FieldItemNodeData under TargetAbstractFieldNodeData', () => {
      const abstractField = createMockField(sourceDoc.fields[0], {
        name: 'AbstractAnimal',
        wrapperKind: 'abstract',
      });
      const candidateField = createMockField(sourceDoc.fields[0], {
        name: 'Cat',
        parent: abstractField,
      });
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      const fieldItem = new FieldItem(targetDocNode.mappingTree, candidateField);
      const fieldItemNode = new FieldItemNodeData(abstractNode, fieldItem);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData under TargetDocumentNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldItemNode)).toBe(false);
    });

    it('should return false for FieldItemNodeData of a child of the selected substitute (#4158)', () => {
      const abstractField = createMockField(sourceDoc.fields[0], {
        name: 'AbstractAnimal',
        wrapperKind: 'abstract',
      });
      const catField = createMockField(sourceDoc.fields[0], { name: 'Cat', parent: abstractField });
      const nameField = createMockField(sourceDoc.fields[0], { name: 'name', parent: catField });
      // The selected Cat row: its field is the substitute and abstractField is the wrapper.
      const catNode = new TargetAbstractFieldNodeData(targetDocNode, catField);
      catNode.abstractField = abstractField;
      const nameItem = new FieldItem(targetDocNode.mappingTree, nameField);
      const nameNode = new FieldItemNodeData(catNode, nameItem);
      expect(VisualizationUtilService.isAbstractWrapperMember(nameNode)).toBe(false);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldNode)).toBe(false);
    });

    it('should return false for AbstractFieldNodeData itself', () => {
      const abstractField = createMockField(sourceDoc.fields[0], {
        name: 'AbstractAnimal',
        wrapperKind: 'abstract',
      });
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractWrapperMember(abstractNode)).toBe(false);
    });
  });

  describe('isChoiceWrapperMember', () => {
    it('should return true for FieldItemNodeData under TargetChoiceFieldNodeData', () => {
      const choiceField = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        wrapperKind: 'choice',
      });
      const memberField = createMockField(sourceDoc.fields[0], {
        name: 'Email',
        parent: choiceField,
      });
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      const fieldItem = new FieldItem(targetDocNode.mappingTree, memberField);
      const fieldItemNode = new FieldItemNodeData(choiceNode, fieldItem);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData under TargetDocumentNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldItemNode)).toBe(false);
    });

    it('should return false for FieldItemNodeData of a child of the selected member (#4158)', () => {
      const choiceField = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        wrapperKind: 'choice',
      });
      const obrField = createMockField(sourceDoc.fields[0], { name: 'OBR', parent: choiceField });
      const obr3Field = createMockField(sourceDoc.fields[0], { name: 'OBR.3', parent: obrField });
      // The selected OBR row: its field is the member and choiceField is the wrapper.
      const obrNode = new TargetChoiceFieldNodeData(targetDocNode, obrField);
      obrNode.choiceField = choiceField;
      const obr3Item = new FieldItem(targetDocNode.mappingTree, obr3Field);
      const obr3Node = new FieldItemNodeData(obrNode, obr3Item);
      expect(VisualizationUtilService.isChoiceWrapperMember(obr3Node)).toBe(false);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldNode)).toBe(false);
    });

    it('should return false for ChoiceFieldNodeData itself', () => {
      const choiceField = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        wrapperKind: 'choice',
      });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceWrapperMember(choiceNode)).toBe(false);
    });
  });

  describe('isTerminalField', () => {
    it('should return true for FieldNodeData with no children (terminal/primitive field)', () => {
      // Create a field with no children - a primitive/terminal field
      const terminalField = createMockField(sourceDoc.fields[0], { fields: [] });
      const fieldNode = new FieldNodeData(sourceDocNode, terminalField);
      expect(VisualizationUtilService.isTerminalField(fieldNode)).toBe(true);
    });

    it('should return false for FieldNodeData with children (non-terminal field)', () => {
      // Use the existing field which has children (complex type)
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isTerminalField(fieldNode)).toBe(false);
    });
  });

  describe('getInlineContainerCopyOf', () => {
    const createTargetNode = () => {
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      return { tree, treeNode: new TargetDocumentNodeData(targetDoc, tree) };
    };

    it('should return the CopyOfSelector of a CopyOfFieldNodeData', () => {
      const { tree, treeNode } = createTargetNode();
      const copyOf = new CopyOfSelector(tree);
      tree.children.push(copyOf);
      const nodeData = new CopyOfFieldNodeData(treeNode, copyOf, targetDoc.fields[0]);
      expect(VisualizationUtilService.getInlineContainerCopyOf(nodeData)).toBe(copyOf);
    });

    it('should return undefined for a FieldItemNodeData, whose copy-of is nested inside the element', () => {
      const { tree, treeNode } = createTargetNode();
      const shipOrderFI = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(shipOrderFI);
      shipOrderFI.children.push(new CopyOfSelector(shipOrderFI));
      expect(
        VisualizationUtilService.getInlineContainerCopyOf(new FieldItemNodeData(treeNode, shipOrderFI)),
      ).toBeUndefined();
    });

    it('should return undefined for a plain FieldNodeData with no mapping', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.getInlineContainerCopyOf(fieldNode)).toBeUndefined();
    });
  });
});
