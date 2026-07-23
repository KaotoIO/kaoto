import { DocumentDefinition, DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { QName } from '../../xml-schema-ts/QName';
import { FieldOverrideService } from '../document/field-override.service';
import { XmlSchemaDocument, XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { VisualizationService } from './visualization.service';
import { WrapperActionService } from './wrapper-action.service';

vi.mock('../document/field-override.service', () => ({
  FieldOverrideService: {
    revertFieldTypeOverride: vi.fn(),
    revertFieldSubstitution: vi.fn(),
    getFieldSubstitutionCandidates: vi.fn().mockReturnValue({}),
    applyFieldSubstitution: vi.fn(),
  },
}));

vi.mock('./visualization.service', () => ({
  VisualizationService: {
    getChoiceMemberLabel: vi.fn().mockReturnValue('choice-label'),
  },
}));

function mockField(overrides: Partial<IField> = {}): IField {
  return {
    name: 'field',
    displayName: 'Field',
    id: 'field-id',
    type: Types.String,
    fields: [],
    minOccurs: 1,
    maxOccurs: 1,
    namespacePrefix: null,
    namespaceURI: '',
    namedTypeFragmentRefs: [],
    typeOverride: FieldOverrideVariant.NONE,
    ...overrides,
  } as IField;
}

function mockSubstituteInfo(
  name: string,
  ns: string = 'http://test',
  type: Types = Types.Container,
): IFieldSubstituteInfo {
  return {
    qname: new QName(ns, name),
    displayName: name,
    type,
    typeQName: null,
    namedTypeFragmentRefs: [],
  };
}

describe('WrapperActionService', () => {
  const namespaceMap = { xs: 'http://www.w3.org/2001/XMLSchema' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveCandidateField', () => {
    it('should use cached candidates when wrapperField matches knownWrapper', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperActionService.resolveCandidateField(
        wrapperField,
        'ns:Cat',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBe(childField);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).not.toHaveBeenCalled();
    });

    it('should call FieldOverrideService when wrapperField differs from knownWrapper', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const otherWrapper = mockField();
      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Cat': mockSubstituteInfo('Cat'),
      });

      const result = WrapperActionService.resolveCandidateField(wrapperField, 'ns:Cat', {}, otherWrapper, namespaceMap);

      expect(result).toBe(childField);
      expect(FieldOverrideService.getFieldSubstitutionCandidates).toHaveBeenCalledWith(wrapperField, namespaceMap);
    });

    it('should return undefined when qname not found in candidates', () => {
      const wrapperField = mockField();
      const result = WrapperActionService.resolveCandidateField(
        wrapperField,
        'ns:Unknown',
        {},
        wrapperField,
        namespaceMap,
      );

      expect(result).toBeUndefined();
    });

    it('should return matching child field when candidate is found', () => {
      const childField = mockField({ name: 'Dog', namespaceURI: 'http://test' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Dog': mockSubstituteInfo('Dog'),
      };

      const result = WrapperActionService.resolveCandidateField(
        wrapperField,
        'ns:Dog',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBe(childField);
    });

    it('should return undefined when no child field matches the candidate qname', () => {
      const childField = mockField({ name: 'Cat', namespaceURI: 'http://other' });
      const wrapperField = mockField({ fields: [childField] });
      const cachedCandidates: Record<string, IFieldSubstituteInfo> = {
        'ns:Cat': mockSubstituteInfo('Cat'),
      };

      const result = WrapperActionService.resolveCandidateField(
        wrapperField,
        'ns:Cat',
        cachedCandidates,
        wrapperField,
        namespaceMap,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('fieldToCandidate', () => {
    it('should use getChoiceMemberLabel for choice wrapper fields', () => {
      const field = mockField({ wrapperKind: 'choice', type: Types.Container });
      vi.mocked(VisualizationService.getChoiceMemberLabel).mockReturnValue('(email | phone)');

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.label).toBe('(email | phone)');
      expect(VisualizationService.getChoiceMemberLabel).toHaveBeenCalledWith(field);
    });

    it('should use displayName for non-choice fields', () => {
      const field = mockField({ displayName: 'EmailAddress', type: Types.String });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 2);

      expect(result.label).toBe('EmailAddress');
      expect(result.typeBadge).toBe(Types.String);
      expect(result.selection).toEqual({ memberIndex: 2 });
    });

    it('should fall back to name when displayName is empty', () => {
      const field = mockField({ displayName: '', name: 'fallbackName' });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.label).toBe('fallbackName');
    });

    it('should populate childrenPreview from first 3 children', () => {
      const children = [
        mockField({ displayName: 'A', name: 'a' }),
        mockField({ displayName: 'B', name: 'b' }),
        mockField({ displayName: 'C', name: 'c' }),
        mockField({ displayName: 'D', name: 'd' }),
        mockField({ displayName: 'E', name: 'e' }),
      ];
      const field = mockField({ fields: children });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toEqual(['A', 'B', 'C']);
    });

    it('should return undefined childrenPreview for field with no children', () => {
      const field = mockField({ fields: [] });

      const result = WrapperActionService.fieldToCandidate(field, 'key1', 0);

      expect(result.childrenPreview).toBeUndefined();
    });
  });

  describe('revertOverride', () => {
    it('should call revertFieldSubstitution when field has SUBSTITUTION override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.SUBSTITUTION;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(field, namespaceMap);
      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    });

    it('should not call any service when field has no override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.NONE;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
      expect(FieldOverrideService.revertFieldSubstitution).not.toHaveBeenCalled();
    });

    it('should call revertFieldTypeOverride for type override', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.SAFE;

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldTypeOverride).toHaveBeenCalledWith(field, namespaceMap);
    });

    it('should call revertFieldSubstitution when field is abstract with selectedMemberQName', () => {
      const testTargetDoc = TestUtil.createTargetOrderDoc();
      const field = testTargetDoc.fields[0];
      field.typeOverride = FieldOverrideVariant.NONE;
      field.wrapperKind = 'abstract';
      field.selectedMemberQName = new QName('http://test', 'Cat');

      WrapperActionService.revertOverride(field, namespaceMap);

      expect(FieldOverrideService.revertFieldSubstitution).toHaveBeenCalledWith(field, namespaceMap);
      expect(FieldOverrideService.revertFieldTypeOverride).not.toHaveBeenCalled();
    });
  });

  describe('computeAddFieldCandidates', () => {
    function createXmlSchemaDocument(): XmlSchemaDocument {
      const definition = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'test');
      return new XmlSchemaDocument(definition, new XmlSchemaCollection());
    }

    it('should return all candidates when no existing field items', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const childA = new XmlSchemaField(parent, 'ChildA', false);
      childA.type = Types.String;
      const childB = new XmlSchemaField(parent, 'ChildB', false);
      childB.type = Types.String;
      parent.fields = [childA, childB];
      doc.fields = [parent];

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, []);

      expect(result.candidates).toHaveLength(2);
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]).toBe(childA);
      expect(result.fields[1]).toBe(childB);
    });

    it('should exclude maxOccurs=1 child when slot is occupied by direct field match', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const childA = new XmlSchemaField(parent, 'ChildA', false);
      childA.type = Types.String;
      childA.maxOccurs = 1;
      const childB = new XmlSchemaField(parent, 'ChildB', false);
      childB.type = Types.String;
      childB.maxOccurs = 1;
      parent.fields = [childA, childB];
      doc.fields = [parent];

      const tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
      const existingFieldItem = new FieldItem(tree, childA);

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

      expect(result.candidates).toHaveLength(1);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]).toBe(childB);
    });

    it('should not exclude maxOccurs=unbounded child even when occupied', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const child = new XmlSchemaField(parent, 'Child', false);
      child.type = Types.String;
      child.maxOccurs = 'unbounded';
      parent.fields = [child];
      doc.fields = [parent];

      const tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
      const existingFieldItem = new FieldItem(tree, child);

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

      expect(result.candidates).toHaveLength(1);
      expect(result.fields[0]).toBe(child);
    });

    it('should exclude abstract wrapper (maxOccurs=1) when a descendant substitute is mapped', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const abstractField = new XmlSchemaField(parent, 'Abstract', false);
      abstractField.type = Types.Container;
      abstractField.wrapperKind = 'abstract';
      abstractField.maxOccurs = 1;
      const concreteChild = new XmlSchemaField(abstractField, 'Concrete', false);
      concreteChild.type = Types.String;
      abstractField.fields = [concreteChild];
      parent.fields = [abstractField];
      doc.fields = [parent];

      const tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
      const existingFieldItem = new FieldItem(tree, concreteChild);

      vi.mocked(FieldOverrideService.getFieldSubstitutionCandidates).mockReturnValue({
        'ns:Concrete': mockSubstituteInfo('Concrete'),
      });
      vi.spyOn(WrapperActionService, 'resolveCandidateField').mockReturnValue(concreteChild);

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

      expect(result.candidates).toHaveLength(0);
      expect(result.fields).toHaveLength(0);
    });

    it('should exclude choice wrapper (maxOccurs=1) when a member is mapped', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const choiceField = new XmlSchemaField(parent, '__choice__', false);
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      choiceField.maxOccurs = 1;
      const memberA = new XmlSchemaField(choiceField, 'MemberA', false);
      memberA.type = Types.String;
      const memberB = new XmlSchemaField(choiceField, 'MemberB', false);
      memberB.type = Types.String;
      choiceField.fields = [memberA, memberB];
      parent.fields = [choiceField];
      doc.fields = [parent];

      const tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
      const existingFieldItem = new FieldItem(tree, memberA);

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

      expect(result.candidates).toHaveLength(0);
      expect(result.fields).toHaveLength(0);
    });

    it('should not exclude choice wrapper (maxOccurs=unbounded) when a member is mapped', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const choiceField = new XmlSchemaField(parent, '__choice__', false);
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      choiceField.maxOccurs = 'unbounded';
      const memberA = new XmlSchemaField(choiceField, 'MemberA', false);
      memberA.type = Types.String;
      const memberB = new XmlSchemaField(choiceField, 'MemberB', false);
      memberB.type = Types.String;
      choiceField.fields = [memberA, memberB];
      parent.fields = [choiceField];
      doc.fields = [parent];

      const tree = new MappingTree(DocumentType.TARGET_BODY, 'test', DocumentDefinitionType.XML_SCHEMA);
      const existingFieldItem = new FieldItem(tree, memberA);

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

      expect(result.candidates).toHaveLength(2);
      expect(result.fields[0]).toBe(memberA);
      expect(result.fields[1]).toBe(memberB);
    });

    it('should dissolve sequence wrappers and include their member fields', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const seqWrapper = new XmlSchemaField(parent, 'seq', false);
      seqWrapper.wrapperKind = 'sequence';
      const seqChildA = new XmlSchemaField(seqWrapper, 'SeqChildA', false);
      seqChildA.type = Types.String;
      const seqChildB = new XmlSchemaField(seqWrapper, 'SeqChildB', false);
      seqChildB.type = Types.String;
      seqWrapper.fields = [seqChildA, seqChildB];
      parent.fields = [seqWrapper];
      doc.fields = [parent];

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, []);

      expect(result.candidates).toHaveLength(2);
      expect(result.fields[0]).toBe(seqChildA);
      expect(result.fields[1]).toBe(seqChildB);
    });

    it('should exclude maxOccurs=1 children in forEachContext', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const singleChild = new XmlSchemaField(parent, 'Single', false);
      singleChild.type = Types.String;
      singleChild.maxOccurs = 1;
      const collectionChild = new XmlSchemaField(parent, 'Collection', false);
      collectionChild.type = Types.String;
      collectionChild.maxOccurs = 'unbounded';
      parent.fields = [singleChild, collectionChild];
      doc.fields = [parent];

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [], true);

      expect(result.candidates).toHaveLength(1);
      expect(result.fields[0]).toBe(collectionChild);
    });

    it('should include all children when forEachContext is false (default)', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const singleChild = new XmlSchemaField(parent, 'Single', false);
      singleChild.type = Types.String;
      singleChild.maxOccurs = 1;
      const collectionChild = new XmlSchemaField(parent, 'Collection', false);
      collectionChild.type = Types.String;
      collectionChild.maxOccurs = 'unbounded';
      parent.fields = [singleChild, collectionChild];
      doc.fields = [parent];

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, []);

      expect(result.candidates).toHaveLength(2);
      expect(result.fields[0]).toBe(singleChild);
      expect(result.fields[1]).toBe(collectionChild);
    });

    it('should dissolve sequences and apply forEachContext filter to members', () => {
      const doc = createXmlSchemaDocument();
      const parent = new XmlSchemaField(doc, 'Parent', false);
      parent.type = Types.Container;
      const seqWrapper = new XmlSchemaField(parent, 'seq', false);
      seqWrapper.wrapperKind = 'sequence';
      const singleMember = new XmlSchemaField(seqWrapper, 'Single', false);
      singleMember.type = Types.String;
      singleMember.maxOccurs = 1;
      const collectionMember = new XmlSchemaField(seqWrapper, 'Collection', false);
      collectionMember.type = Types.String;
      collectionMember.maxOccurs = 'unbounded';
      seqWrapper.fields = [singleMember, collectionMember];
      parent.fields = [seqWrapper];
      doc.fields = [parent];

      const result = WrapperActionService.computeAddFieldCandidates(parent.fields, {}, [], true);

      expect(result.candidates).toHaveLength(1);
      expect(result.fields[0]).toBe(collectionMember);
    });
  });
});
