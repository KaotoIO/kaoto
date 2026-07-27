import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import { IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { QName } from '../../xml-schema-ts/QName';
import { FieldOverrideService } from '../document/field-override.service';
import { XmlSchemaDocument, XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { FieldCandidateService } from './field-candidate.service';

vi.mock('../document/field-override.service', () => ({
  FieldOverrideService: {
    getFieldSubstitutionCandidates: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('./visualization.service', () => ({
  VisualizationService: {
    getChoiceMemberLabel: vi.fn().mockReturnValue('choice-label'),
  },
}));

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

describe('FieldCandidateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, []);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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
      vi.spyOn(FieldCandidateService, 'resolveCandidateField').mockReturnValue(concreteChild);

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, []);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [], true);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, []);

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

      const result = FieldCandidateService.computeAddFieldCandidates(parent.fields, {}, [], true);

      expect(result.candidates).toHaveLength(1);
      expect(result.fields[0]).toBe(collectionMember);
    });
  });
});
