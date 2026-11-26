import { DocumentType, IField } from '../../../models/datamapper/document';
import { CopyOfSelector, FieldItem, IfItem, MappingTree } from '../../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../models/datamapper/visualization';
import { FieldOverrideService } from '../../../services/document/field-override.service';
import { WrapperSelectionService } from '../../../services/document/wrapper-selection.service';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
import { ChoiceFieldService } from '../../../services/visualization/choice-field.service';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
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
} from '../../../stubs/datamapper/cardinality-test-helpers';
import {
  getChoiceRepeatingAbstractCatXslt,
  getChoiceRepeatingAbstractXsd,
  getChoiceRepeatingContainerMemberXsd,
  getChoiceRepeatingMemberXsd,
  getChoiceWithAbstractXsd,
  getFieldSubstitutionXsd,
  TestUtil,
} from '../../../stubs/datamapper/data-mapper';
import { createGuardedCsvRows } from '../../../stubs/datamapper/target-render-test-helpers';
import { QName } from '../../../xml-schema-ts/QName';
import {
  formatTypeQName,
  getOptionalGuardExplanation,
  isFieldNode,
  OPTIONAL_GUARD_LABEL,
  prepareFieldDetails,
} from './field-details-utils';

const abstractDoc = (documentType: DocumentType) =>
  parseXsdDocument(documentType, 'ChoiceRepeatingAbstract.xsd', getChoiceRepeatingAbstractXsd());

const occurrenceRows = (field: IField, nodeData?: NodeData): Record<string, string> =>
  Object.fromEntries(
    prepareFieldDetails(field, {}, nodeData)
      .filter((row) => row.label.endsWith('Occurs'))
      .map((row) => [row.label, row.value]),
  );

const expectOccurrenceRows = (
  field: IField,
  nodeData: NodeData | undefined,
  own: string | [string, string],
  effective?: [string, string],
) => {
  const rows = occurrenceRows(field, nodeData);
  const [min, max] = Array.isArray(own) ? own : [undefined, own];
  if (min !== undefined) expect(rows['Min Occurs']).toBe(min);
  expect(rows['Max Occurs']).toBe(max);
  expect(rows['Effective Min Occurs']).toBe(effective?.[0]);
  expect(rows['Effective Max Occurs']).toBe(effective?.[1]);
};

const selectedRepeatingChoiceMemberRow = (): ChoiceFieldNodeData => {
  const doc = abstractDoc(DocumentType.SOURCE_BODY);
  const choice = findField(findField(doc, 'RequiredMemberInOptionalChoice'), '__choice__');
  WrapperSelectionService.setChoiceSelection(doc, choice, 0, { ns0: NS_POC });
  const memberRow = rowNamed(rowNamed(documentRows(doc)[0], 'RequiredMemberInOptionalChoice'), 'Required');
  expect(memberRow).toBeInstanceOf(ChoiceFieldNodeData);
  expect((memberRow as ChoiceFieldNodeData).choiceField).toBe(choice);
  return memberRow as ChoiceFieldNodeData;
};

describe('field-details-utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFieldNode', () => {
    it('should return true for FieldNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const field = shipOrderDoc.fields[0];
      const fieldNodeData = new FieldNodeData(documentNodeData, field);

      expect(isFieldNode(fieldNodeData)).toBe(true);
    });

    it('should return true for FieldItemNodeData', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, targetDoc.definitionType);
      const targetDocNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
      const field = targetDoc.fields[0];
      const targetFieldNodeData = new TargetFieldNodeData(targetDocNodeData, field);
      const fieldItem = new FieldItem(mappingTree, field);
      const fieldItemNodeData = new FieldItemNodeData(targetFieldNodeData, fieldItem);

      expect(isFieldNode(fieldItemNodeData)).toBe(true);
    });

    it('should return true for AddMappingNodeData', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, targetDoc.definitionType);
      const targetDocNodeData = new TargetDocumentNodeData(targetDoc, mappingTree);
      const field = targetDoc.fields[0];
      const addMappingNodeData = new AddMappingNodeData(targetDocNodeData, field);

      expect(isFieldNode(addMappingNodeData)).toBe(true);
    });

    it('should return false for DocumentNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);

      expect(isFieldNode(documentNodeData)).toBe(false);
    });
  });

  describe('formatTypeQName', () => {
    it('should return "N/A" when typeQName is null', () => {
      expect(formatTypeQName(null)).toBe('N/A');
    });

    it('should return local part when namespace URI is not present', () => {
      const qname = new QName(null, 'string');
      expect(formatTypeQName(qname)).toBe('string');
    });

    it('should return formatted string with namespace when local part is empty', () => {
      const qname = new QName('http://example.com', '');
      expect(formatTypeQName(qname)).toBe(' (http://example.com)');
    });

    it('should return "N/A" when getLocalPart returns null', () => {
      const qname = new QName('http://example.com', 'test');
      vi.spyOn(qname, 'getLocalPart').mockReturnValue(null);
      expect(formatTypeQName(qname)).toBe('N/A (http://example.com)');
    });

    it('should return formatted string with namespace when both are present', () => {
      const qname = new QName('http://www.w3.org/2001/XMLSchema', 'string');
      expect(formatTypeQName(qname)).toBe('string (http://www.w3.org/2001/XMLSchema)');
    });
  });

  describe('prepareFieldDetails occurrence rows', () => {
    it('should show the own maxOccurs and no Effective rows when nodeData is undefined', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const field = { ...shipOrderDoc.fields[0], maxOccurs: 5 } as unknown as IField;

      expectOccurrenceRows(field, undefined, '5');
    });

    it('should show the own maxOccurs and no Effective rows for a plain FieldNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const field = shipOrderDoc.fields[0];
      const fieldNodeData = new FieldNodeData(documentNodeData, field);

      expectOccurrenceRows(field, fieldNodeData, String(field.maxOccurs));
    });

    it('should show the effective occurrence for a FieldItemNodeData with a repeating wrapperField', () => {
      const doc = abstractDoc(DocumentType.TARGET_BODY);
      const container = findField(doc, 'RequiredMemberInOptionalChoice');
      const choice = findField(container, '__choice__');
      const requiredField = findField(choice, 'Required');
      const tree = createTargetTree(doc, { ns0: NS_POC });
      const rootItem = new FieldItem(tree, doc.fields[0]);
      tree.children.push(rootItem);
      const containerItem = new FieldItem(rootItem, container);
      rootItem.children.push(containerItem);
      containerItem.children.push(new FieldItem(containerItem, requiredField));

      const requiredRow = descendantRow(
        rowNamed(documentRows(doc, tree)[0], 'RequiredMemberInOptionalChoice'),
        (row) => row instanceof FieldItemNodeData && row.field === requiredField,
        'for the mapped Required',
      ) as FieldItemNodeData;
      expect(requiredRow.wrapperField).toBe(choice);
      expectOccurrenceRows(requiredField, requiredRow, '1', ['0', 'unbounded']);
    });

    it('should show the effective occurrence for a selected ChoiceFieldNodeData', () => {
      const memberRow = selectedRepeatingChoiceMemberRow();

      expect(memberRow.field.maxOccurs).toBe(1);
      expectOccurrenceRows(memberRow.field, memberRow, '1', ['0', 'unbounded']);
    });

    it('should show the referencing particle bounds and the effective occurrence for a selected AbstractFieldNodeData', () => {
      const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
      const wrapper = findField(doc, 'AbstractAnimal');
      FieldOverrideService.applyFieldSubstitution(wrapper, 'ns0:Dog', { ns0: NS_SUBSTITUTION });

      const dogRow = rowNamed(documentRows(doc)[0], 'Dog') as AbstractFieldNodeData;
      expect(dogRow).toBeInstanceOf(AbstractFieldNodeData);
      expect(dogRow.abstractField).toBe(wrapper);
      expectOccurrenceRows(dogRow.field, dogRow, 'unbounded', ['0', 'unbounded']);
    });

    it('should show the own maxOccurs and no Effective rows for an unselected ChoiceFieldNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const wrapperField = {
        ...shipOrderDoc.fields[0],
        maxOccurs: 'unbounded',
        wrapperKind: 'choice',
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(documentNodeData, wrapperField);
      // choiceNode.choiceField is undefined (unselected)

      expectOccurrenceRows(wrapperField, choiceNode, 'unbounded');
    });

    it('should show the effective occurrence for a source child of a sequence branch in a repeating choice', () => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const keyField = findField(findField(doc, 'SequenceInRepeatingChoice'), 'Key');
      const keyRow = new FieldNodeData(rowNamed(documentRows(doc)[0], 'SequenceInRepeatingChoice'), keyField);

      expectOccurrenceRows(keyField, keyRow, '1', ['0', 'unbounded']);
    });

    describe('a repeating member of a non-repeating choice', () => {
      it('should show the effective occurrence right after selection', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        const itemRow = rowNamed(documentRows(doc, tree)[0], 'Item') as TargetChoiceFieldNodeData;

        expect(itemRow).toBeInstanceOf(TargetChoiceFieldNodeData);
        expect(itemRow.choiceField?.maxOccurs).toBe(1);
        expectOccurrenceRows(itemRow.field, itemRow, 'unbounded', ['0', 'unbounded']);
      });

      it('should show the effective occurrence after "Wrap with for-each"', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        MappingActionService.applyForEach(rowNamed(documentRows(doc, tree)[0], 'Item') as TargetFieldNodeData);

        const wrappedItemRow = rowNamed(forEachRow(documentRows(doc, tree)[0]), 'Item') as FieldItemNodeData;
        expect(wrappedItemRow).toBeInstanceOf(FieldItemNodeData);
        expect(wrappedItemRow.wrapperField?.maxOccurs).toBe(1);
        expectOccurrenceRows(wrappedItemRow.field, wrappedItemRow, 'unbounded', ['0', 'unbounded']);
      });

      it('should show the own maxOccurs and no Effective rows for a mapped child of the selected member', () => {
        const { doc, tree } = selectFirstChoiceMember(
          'ChoiceRepeatingContainerMember.xsd',
          getChoiceRepeatingContainerMemberXsd(),
        );
        const itemItem = tree.children[0].children.find(
          (child): child is FieldItem => child instanceof FieldItem && child.field.name === 'Item',
        );
        if (!itemItem) throw new Error('No Item field item');
        const nameField = findField(itemItem.field, 'Name');
        itemItem.children.push(new FieldItem(itemItem, nameField));

        const nameRow = rowNamed(rowNamed(documentRows(doc, tree)[0], 'Item'), 'Name') as FieldItemNodeData;
        expect(nameRow).toBeInstanceOf(FieldItemNodeData);
        expect(nameRow.parent).toBeInstanceOf(TargetChoiceFieldNodeData);
        expect(nameRow.wrapperField).toBeUndefined();
        expectOccurrenceRows(nameField, nameRow, '1');
      });
    });

    describe('a non-repeating wrapper nested in a repeating compositor', () => {
      it('should show the effective occurrence for a mapped row whose wrapperField does not repeat', () => {
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
        ) as FieldItemNodeData;
        expect(catRow.wrapperField?.wrapperKind).toBe('abstract');
        expect(catRow.wrapperField?.maxOccurs).toBe(1);
        expectOccurrenceRows(catField, catRow, '1', ['0', 'unbounded']);
      });

      it('should show the effective occurrence for a selected member of a non-repeating abstract wrapper', () => {
        const doc = parseXsdDocument(
          DocumentType.TARGET_BODY,
          'ChoiceWithAbstract.xsd',
          getChoiceWithAbstractXsd(),
          NOTIFICATION,
        );
        const shortField = findField(doc, 'Short');
        const abstractMessage = findField(repeatingChoiceOf(shortField), 'AbstractMessage');
        const emailField = findField(abstractMessage, 'Email');
        const shortRow = new TargetFieldNodeData(
          new TargetDocumentNodeData(doc, createTargetTree(doc, { ns0: NS_CHOICE_ABSTRACT })),
          shortField,
        );
        const selectedRow = new TargetAbstractFieldNodeData(shortRow, emailField);
        selectedRow.abstractField = abstractMessage;

        expect(abstractMessage.maxOccurs).toBe(1);
        expectOccurrenceRows(emailField, selectedRow, '1', ['0', 'unbounded']);
      });
    });

    describe('a repeating abstract wrapper that is not the row back-reference', () => {
      it('should show the effective occurrence for the target member rows of a loaded mapping', () => {
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
        const catRow = rowNamed(wrapperRow, 'Cat') as FieldItemNodeData;
        const dogRow = rowNamed(wrapperRow, 'Dog') as TargetFieldNodeData;

        expect(catRow).toBeInstanceOf(FieldItemNodeData);
        expect(catRow.wrapperField?.maxOccurs).toBe(1);
        expect(dogRow).toBeInstanceOf(TargetFieldNodeData);
        expectOccurrenceRows(catRow.field, catRow, 'unbounded', ['0', 'unbounded']);
        expectOccurrenceRows(dogRow.field, dogRow, 'unbounded', ['0', 'unbounded']);
      });

      it('should show the effective occurrence for a source candidate row of the unselected wrapper', () => {
        const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
        const wrapperRow = descendantRow(
          documentRows(doc)[0],
          (row) => row instanceof AbstractFieldNodeData && row.field.name === 'AbstractAnimal',
          'for AbstractAnimal',
        );
        const dogRow = rowNamed(wrapperRow, 'Dog') as FieldNodeData;

        expect(dogRow.field.maxOccurs).toBe(1);
        expectOccurrenceRows(dogRow.field, dogRow, 'unbounded', ['0', 'unbounded']);
      });
    });

    it('should show the product of the bounds when two nested levels repeat', () => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const aField = findField(findField(findField(doc, 'NestedRepeat'), '__choice__'), 'A');
      const aRow = new FieldNodeData(rowNamed(documentRows(doc)[0], 'NestedRepeat'), aField);

      expect(aField.parent).toHaveProperty('maxOccurs', 3);
      expectOccurrenceRows(aField, aRow, '1', ['0', 'unbounded']);
    });

    it('should show the effective occurrence for a copy-of row under a non-repeating abstract wrapper', () => {
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

      expect(emailField.maxOccurs).toBe(1);
      expectOccurrenceRows(emailField, copyOfRow, '1', ['0', 'unbounded']);
    });

    describe('fixture rows', () => {
      const memberOf = (documentType: DocumentType, containerName: string, fieldName: string) =>
        findField(findField(abstractDoc(documentType), containerName), fieldName);

      it.each<[string, string, string, [string, string], [string, string] | undefined]>([
        ['a repeating choice', 'BoundedChoice', '__choice__', ['1', '3'], undefined],
        ['a member under a bounded reference to the head', 'BoundedAbstract', 'Dog', ['1', '3'], ['0', '3']],
        [
          'the single member of a substitution group in a repeating choice',
          'SingleMemberAbstract',
          'Tree',
          ['1', '1'],
          ['1', '2'],
        ],
        [
          'a bounded child of a bounded sequence in a bounded choice',
          'RequiredSingleChoice',
          'Twice',
          ['2', '2'],
          ['4', '12'],
        ],
        ['the only alternative of a repeating choice', 'RepeatingSingleChoice', 'Once', ['1', '1'], ['1', '3']],
        [
          'the only alternative of an optional choice',
          'OptionalSingleChoice',
          'Lone',
          ['1', 'unbounded'],
          ['0', 'unbounded'],
        ],
        [
          'the only alternative of a choice, with equal values in separate objects',
          'AbstractInChoice',
          'Animal',
          ['1', 'unbounded'],
          undefined,
        ],
        ['a member under an optional reference to the head', 'OptionalAbstract', 'Dog', ['0', '1'], undefined],
      ])('should show the rows of %s', (_description, containerName, fieldName, own, effective) => {
        expectOccurrenceRows(memberOf(DocumentType.SOURCE_BODY, containerName, fieldName), undefined, own, effective);
      });

      it('should show the own minimum of the referencing particle for a substitution member', () => {
        const dog = memberOf(DocumentType.SOURCE_BODY, 'OptionalAbstract', 'Dog');
        expect(dog.minOccurs).toBe(1);
        expect(occurrenceRows(dog)['Min Occurs']).toBe('0');
      });

      it('should show both Effective rows when only the maximum differs', () => {
        const rows = occurrenceRows(memberOf(DocumentType.SOURCE_BODY, 'RepeatingSingleChoice', 'Once'));
        expect(rows['Min Occurs']).toBe(rows['Effective Min Occurs']);
        expect(rows['Effective Max Occurs']).toBe('3');
      });

      it('should show the same rows for an unselected and a selected source member', () => {
        const doc = abstractDoc(DocumentType.SOURCE_BODY);
        const container = findField(doc, 'BoundedChoice');
        const choice = findField(container, '__choice__');
        const bounded = findField(choice, 'Bounded');
        const unselectedRow = new FieldNodeData(rowNamed(documentRows(doc)[0], 'BoundedChoice'), bounded);
        expectOccurrenceRows(bounded, unselectedRow, ['1', '5'], ['0', '15']);

        WrapperSelectionService.setChoiceSelection(doc, choice, 0, { ns0: NS_POC });
        const selectedRow = rowNamed(rowNamed(documentRows(doc)[0], 'BoundedChoice'), 'Bounded');
        expect(selectedRow).toBeInstanceOf(ChoiceFieldNodeData);
        expectOccurrenceRows((selectedRow as ChoiceFieldNodeData).field, selectedRow, ['1', '5'], ['0', '15']);
      });

      it('should show the same rows for a member selected on the target', () => {
        const doc = abstractDoc(DocumentType.TARGET_BODY);
        const tree = createTargetTree(doc, { ns0: NS_POC });
        const choice = findField(findField(doc, 'BoundedChoice'), '__choice__');
        const choiceRow = rowWhere(
          rowNamed(documentRows(doc, tree)[0], 'BoundedChoice'),
          (row) => row instanceof TargetChoiceFieldNodeData,
          'for the choice',
        );
        ChoiceFieldService.dispatchChoiceSelection(choiceRow, choice, { memberIndex: 0 }, tree.namespaceMap, true);

        const boundedRow = descendantRow(
          rowNamed(documentRows(doc, tree)[0], 'BoundedChoice'),
          (row) => row instanceof FieldItemNodeData && row.field.name === 'Bounded',
          'for the selected Bounded',
        ) as FieldItemNodeData;
        expectOccurrenceRows(boundedRow.field, boundedRow, ['1', '5'], ['0', '15']);
      });

      it('should show the Effective rows before the optional guard row', () => {
        const doc = abstractDoc(DocumentType.TARGET_BODY);
        const container = findField(doc, 'OptionalMemberInRequiredChoice');
        const optionalField = findField(container, 'Optional');
        const tree = createTargetTree(doc, { ns0: NS_POC });
        const rootItem = new FieldItem(tree, doc.fields[0]);
        tree.children.push(rootItem);
        const containerItem = new FieldItem(rootItem, container);
        rootItem.children.push(containerItem);
        containerItem.children.push(new FieldItem(containerItem, optionalField));
        const optionalRow = descendantRow(
          rowNamed(documentRows(doc, tree)[0], 'OptionalMemberInRequiredChoice'),
          (row) => row instanceof FieldItemNodeData && row.field === optionalField,
          'for the mapped Optional',
        ) as FieldItemNodeData;
        const guard = new IfItem(containerItem);
        guard.expression = '/ns0:Source/ns0:Optional';
        optionalRow.autoOptionalIfItem = guard;

        const labels = prepareFieldDetails(optionalField, {}, optionalRow).map(({ label }) => label);

        expect(labels.slice(labels.indexOf('Min Occurs'), labels.indexOf(OPTIONAL_GUARD_LABEL) + 1)).toEqual([
          'Min Occurs',
          'Max Occurs',
          'Effective Min Occurs',
          'Effective Max Occurs',
          OPTIONAL_GUARD_LABEL,
        ]);
      });
    });
  });

  describe('getOptionalGuardExplanation', () => {
    it('should name the guarding source path and how to always write the field', () => {
      expect(getOptionalGuardExplanation('/CSV/STATUS')).toEqual(
        'This field is written only when /CSV/STATUS exists in the source. The guarding if is hidden. ' +
          'Changing the XPath to anything other than a simple path to an optional source shows the if. ' +
          'To always write the field: ⋮ → Remove optional guard.',
      );
    });
  });

  describe('prepareFieldDetails', () => {
    it('should explain a see-through optional guard in the row after the last occurrence row', () => {
      const { guardedOptional } = createGuardedCsvRows();

      const details = prepareFieldDetails(guardedOptional.field, {}, guardedOptional);

      const labels = details.map(({ label }) => label);
      const occurrenceLabels = labels.filter((label) => label.endsWith('Occurs'));
      const lastOccurrenceRow = labels.indexOf(occurrenceLabels[occurrenceLabels.length - 1]);
      expect(labels.indexOf(OPTIONAL_GUARD_LABEL)).toEqual(lastOccurrenceRow + 1);
      expect(details).toContainEqual({
        label: OPTIONAL_GUARD_LABEL,
        value: getOptionalGuardExplanation('/CSV/STATUS'),
      });
    });

    it('should not explain an optional guard on a field mapped without one', () => {
      const { unguardedOptional } = createGuardedCsvRows();

      const details = prepareFieldDetails(unguardedOptional.field, {}, unguardedOptional);

      expect(details.map(({ label }) => label)).not.toContain(OPTIONAL_GUARD_LABEL);
    });

    const createMockField = (overrides: Partial<IField> = {}): IField => {
      return {
        name: 'testField',
        type: 'Element',
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'string'),
        minOccurs: 1,
        maxOccurs: 1,
        namespaceURI: '',
        namespacePrefix: null,
        isAttribute: false,
        nillable: false,
        wrapperKind: undefined,
        description: undefined,
        ...overrides,
      } as IField;
    };

    it('should include all basic field properties', () => {
      const field = createMockField();
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Category', value: 'Element' });
      expect(result).toContainEqual({ label: 'Type', value: 'string (http://www.w3.org/2001/XMLSchema)' });
      expect(result).toContainEqual({ label: 'Min Occurs', value: '1' });
      expect(result).toContainEqual({ label: 'Max Occurs', value: '1' });
    });

    it('should convert empty string to "N/A" for namespace', () => {
      const field = createMockField({
        namespaceURI: '',
        description: undefined,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Namespace', value: 'N/A' });
      expect(result.find((item) => item.label === 'Description')).toBeUndefined();
    });

    it('should convert empty string to "N/A"', () => {
      const field = createMockField({
        description: '',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Description', value: 'N/A' });
    });

    it('should include namespace when present', () => {
      const field = createMockField({
        namespaceURI: 'http://example.com/schema',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Namespace', value: 'http://example.com/schema' });
    });

    it('should include "Attribute: yes" when field is an attribute', () => {
      const field = createMockField({
        isAttribute: true,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Attribute', value: 'yes' });
    });

    it('should not include Attribute when field is not an attribute', () => {
      const field = createMockField({
        isAttribute: false,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Attribute')).toBeUndefined();
    });

    it('should include "Nillable: yes" when field is nillable', () => {
      const field = createMockField({
        nillable: true,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Nillable', value: 'yes' });
    });

    it('should not include Nillable when field is not nillable', () => {
      const field = createMockField({
        nillable: false,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Nillable')).toBeUndefined();
    });

    it('should include wrapperKind when present', () => {
      const field = createMockField({
        wrapperKind: 'choice',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Wrapper Kind', value: 'choice' });
    });

    it('should not include wrapperKind when undefined', () => {
      const field = createMockField({
        wrapperKind: undefined,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Wrapper Kind')).toBeUndefined();
    });

    it('should include description when present', () => {
      const field = createMockField({
        description: 'Test description',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Description', value: 'Test description' });
    });

    it('should handle minOccurs as 0', () => {
      const field = createMockField({
        minOccurs: 0,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Min Occurs', value: '0' });
    });

    it('should handle maxOccurs as "unbounded"', () => {
      const field = createMockField({
        maxOccurs: 'unbounded',
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Max Occurs', value: 'unbounded' });
    });

    it('should call getOverrideDisplayInfo with field and namespaceMap', () => {
      const field = createMockField();
      const namespaceMap = { 'http://example.com': 'ex' };

      // Just verify the function is called - the override logic is tested in FieldNodePopover.test.tsx
      prepareFieldDetails(field, namespaceMap);

      // The function should be called internally, we're just testing the integration
      expect(prepareFieldDetails(field, namespaceMap)).toBeDefined();
    });

    it('should handle undefined minOccurs', () => {
      const field = createMockField({
        minOccurs: undefined as unknown as number,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Min Occurs')).toBeUndefined();
    });

    it('should handle undefined maxOccurs', () => {
      const field = createMockField({
        maxOccurs: undefined as unknown as number,
      });
      const result = prepareFieldDetails(field);

      expect(result.find((item) => item.label === 'Max Occurs')).toBeUndefined();
    });

    it('should show the own and the effective occurrence for a selected collection choice member', () => {
      const memberRow = selectedRepeatingChoiceMemberRow();

      const result = prepareFieldDetails(memberRow.field, {}, memberRow);

      expect(memberRow.field.maxOccurs).toBe(1);
      expect(result).toContainEqual({ label: 'Max Occurs', value: '1' });
      expect(result).toContainEqual({ label: 'Effective Min Occurs', value: '0' });
      expect(result).toContainEqual({ label: 'Effective Max Occurs', value: 'unbounded' });
    });

    it('should show field maxOccurs unchanged when nodeData is not provided', () => {
      const field = createMockField({ maxOccurs: 1 });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Max Occurs', value: '1' });
    });

    it('should handle null typeQName', () => {
      const field = createMockField({
        typeQName: null,
      });
      const result = prepareFieldDetails(field);

      expect(result).toContainEqual({ label: 'Type', value: 'N/A' });
    });
  });
});
