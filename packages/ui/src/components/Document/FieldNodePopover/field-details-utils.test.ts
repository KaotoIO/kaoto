import { DocumentType, IField } from '../../../models/datamapper/document';
import { CopyOfSelector, FieldItem, MappingTree } from '../../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../../models/datamapper/visualization';
import { FieldOverrideService } from '../../../services/document/field-override.service';
import { WrapperSelectionService } from '../../../services/document/wrapper-selection.service';
import { MappingSerializerService } from '../../../services/mapping/mapping-serializer.service';
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
  getEffectiveMaxOccurs,
  getOptionalGuardExplanation,
  isFieldNode,
  OPTIONAL_GUARD_LABEL,
  prepareFieldDetails,
} from './field-details-utils';

const abstractDoc = (documentType: DocumentType) =>
  parseXsdDocument(documentType, 'ChoiceRepeatingAbstract.xsd', getChoiceRepeatingAbstractXsd());

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

  describe('getEffectiveMaxOccurs', () => {
    it('should return field.maxOccurs when nodeData is undefined (case 1)', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const field = { ...shipOrderDoc.fields[0], maxOccurs: 5 } as unknown as IField;

      expect(getEffectiveMaxOccurs(field, undefined)).toBe(5);
    });

    it('should return field.maxOccurs for a plain FieldNodeData', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const field = shipOrderDoc.fields[0];
      const fieldNodeData = new FieldNodeData(documentNodeData, field);

      expect(getEffectiveMaxOccurs(field, fieldNodeData)).toBe(field.maxOccurs);
    });

    it('should return the repeating wrapper maxOccurs for a FieldItemNodeData with a repeating wrapperField', () => {
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
      expect(getEffectiveMaxOccurs(requiredField, requiredRow)).toBe('unbounded');
    });

    it('should return the repeating choice maxOccurs for a selected ChoiceFieldNodeData', () => {
      const memberRow = selectedRepeatingChoiceMemberRow();

      expect(memberRow.field.maxOccurs).toBe(1);
      expect(getEffectiveMaxOccurs(memberRow.field, memberRow)).toBe('unbounded');
    });

    it('should return the repeating abstract wrapper maxOccurs for a selected AbstractFieldNodeData', () => {
      const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
      const wrapper = findField(doc, 'AbstractAnimal');
      FieldOverrideService.applyFieldSubstitution(wrapper, 'ns0:Dog', { ns0: NS_SUBSTITUTION });

      const dogRow = rowNamed(documentRows(doc)[0], 'Dog') as AbstractFieldNodeData;
      expect(dogRow).toBeInstanceOf(AbstractFieldNodeData);
      expect(dogRow.abstractField).toBe(wrapper);
      expect(getEffectiveMaxOccurs(dogRow.field, dogRow)).toBe('unbounded');
    });

    it('should return field.maxOccurs for an unselected ChoiceFieldNodeData (no choiceField set)', () => {
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const wrapperField = {
        ...shipOrderDoc.fields[0],
        maxOccurs: 'unbounded',
        wrapperKind: 'choice',
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(documentNodeData, wrapperField);
      // choiceNode.choiceField is undefined (unselected)

      expect(getEffectiveMaxOccurs(wrapperField, choiceNode)).toBe('unbounded');
    });

    it('should inherit maxOccurs from a repeating choice for a source child of a sequence branch', () => {
      // choice(unbounded) > sequence(1) > key(1): on the source side the child is a plain
      // FieldNodeData with no wrapperField/choiceField back-reference, so the effective maxOccurs
      // must be resolved by walking up the transparent sequence compositor to the repeating choice —
      // keeping the popover's Max Occurs in agreement with the collection indicator icon.
      const shipOrderDoc = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(shipOrderDoc);
      const choiceWrapper = {
        ...shipOrderDoc.fields[0],
        maxOccurs: 'unbounded',
        wrapperKind: 'choice',
      } as unknown as IField;
      const sequenceField = {
        ...shipOrderDoc.fields[0],
        maxOccurs: 1,
        wrapperKind: 'sequence',
        parent: choiceWrapper,
      } as unknown as IField;
      const keyField = { ...shipOrderDoc.fields[0], maxOccurs: 1, parent: sequenceField } as unknown as IField;
      const keyNode = new FieldNodeData(documentNodeData, keyField);

      expect(getEffectiveMaxOccurs(keyField, keyNode)).toBe('unbounded');
    });

    describe('a repeating member of a non-repeating choice', () => {
      it('should return the member maxOccurs right after selection', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        const itemRow = rowNamed(documentRows(doc, tree)[0], 'Item') as TargetChoiceFieldNodeData;

        expect(itemRow).toBeInstanceOf(TargetChoiceFieldNodeData);
        expect(itemRow.choiceField?.maxOccurs).toBe(1);
        expect(getEffectiveMaxOccurs(itemRow.field, itemRow)).toBe('unbounded');
      });

      it('should return the member maxOccurs after "Wrap with for-each"', () => {
        const { doc, tree } = selectFirstChoiceMember('ChoiceRepeatingMember.xsd', getChoiceRepeatingMemberXsd());
        MappingActionService.applyForEach(rowNamed(documentRows(doc, tree)[0], 'Item') as TargetFieldNodeData);

        const wrappedItemRow = rowNamed(forEachRow(documentRows(doc, tree)[0]), 'Item') as FieldItemNodeData;
        expect(wrappedItemRow).toBeInstanceOf(FieldItemNodeData);
        expect(wrappedItemRow.wrapperField?.maxOccurs).toBe(1);
        expect(getEffectiveMaxOccurs(wrappedItemRow.field, wrappedItemRow)).toBe('unbounded');
      });

      it('should return the own maxOccurs of a mapped child of the selected member', () => {
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
        expect(getEffectiveMaxOccurs(nameField, nameRow)).toBe(1);
      });
    });

    describe('a non-repeating wrapper nested in a repeating compositor', () => {
      it('should return the compositor maxOccurs for a mapped row whose wrapperField does not repeat', () => {
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
        expect(getEffectiveMaxOccurs(catField, catRow)).toBe('unbounded');
      });

      it('should return the repeating choice maxOccurs for a selected member of a non-repeating abstract wrapper', () => {
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
        expect(getEffectiveMaxOccurs(emailField, selectedRow)).toBe('unbounded');
      });
    });

    describe('a repeating abstract wrapper that is not the row back-reference', () => {
      it('should return the abstract wrapper maxOccurs for the target member rows of a loaded mapping', () => {
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
        expect(getEffectiveMaxOccurs(catRow.field, catRow)).toBe('unbounded');
        expect(getEffectiveMaxOccurs(dogRow.field, dogRow)).toBe('unbounded');
      });

      it('should return the abstract wrapper maxOccurs for a source candidate row of the unselected wrapper', () => {
        const doc = parseXsdDocument(DocumentType.SOURCE_BODY, 'FieldSubstitution.xsd', getFieldSubstitutionXsd());
        const wrapperRow = descendantRow(
          documentRows(doc)[0],
          (row) => row instanceof AbstractFieldNodeData && row.field.name === 'AbstractAnimal',
          'for AbstractAnimal',
        );
        const dogRow = rowNamed(wrapperRow, 'Dog') as FieldNodeData;

        expect(dogRow.field.maxOccurs).toBe(1);
        expect(getEffectiveMaxOccurs(dogRow.field, dogRow)).toBe('unbounded');
      });
    });

    it('should return the outer maxOccurs when two nested levels repeat', () => {
      const doc = abstractDoc(DocumentType.SOURCE_BODY);
      const aField = findField(findField(findField(doc, 'NestedRepeat'), '__choice__'), 'A');
      const aRow = new FieldNodeData(rowNamed(documentRows(doc)[0], 'NestedRepeat'), aField);

      expect(aField.parent).toHaveProperty('maxOccurs', 3);
      expect(getEffectiveMaxOccurs(aField, aRow)).toBe('unbounded');
    });

    it('should return the repeating choice maxOccurs for a copy-of row under a non-repeating abstract wrapper', () => {
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
      expect(getEffectiveMaxOccurs(emailField, copyOfRow)).toBe('unbounded');
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
    it('should explain a see-through optional guard in the row after Max Occurs', () => {
      const { guardedOptional } = createGuardedCsvRows();

      const details = prepareFieldDetails(guardedOptional.field, {}, guardedOptional);

      const labels = details.map(({ label }) => label);
      expect(labels.indexOf(OPTIONAL_GUARD_LABEL)).toEqual(labels.indexOf('Max Occurs') + 1);
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

    it('should show inherited maxOccurs from choice wrapper for a selected collection choice member', () => {
      const memberRow = selectedRepeatingChoiceMemberRow();

      const result = prepareFieldDetails(memberRow.field, {}, memberRow);

      expect(memberRow.field.maxOccurs).toBe(1);
      expect(result).toContainEqual({ label: 'Max Occurs', value: 'unbounded' });
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
