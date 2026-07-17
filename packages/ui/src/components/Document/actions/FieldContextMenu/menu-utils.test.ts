import { DocumentDefinitionType, DocumentType, IField } from '../../../../models/datamapper/document';
import { DocumentDefinition } from '../../../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../../../models/datamapper/mapping';
import { IFieldSubstituteInfo, Types } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { XmlSchemaDocument, XmlSchemaField } from '../../../../services/document/xml-schema/xml-schema-document.model';
import { WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { XmlSchemaCollection } from '../../../../xml-schema-ts';
import { QName } from '../../../../xml-schema-ts/QName';
import { computeAddFieldCandidates } from './menu-utils';

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
    predicates: [],
    ...overrides,
  } as IField;
}

function mockSubstituteInfo(name: string, type: Types = Types.Container): IFieldSubstituteInfo {
  return {
    qname: new QName('http://test', name),
    displayName: name,
    type,
    typeQName: null,
    namedTypeFragmentRefs: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dissolveChoiceMembers', () => {
  it('should pass through regular members', () => {
    const members = [
      mockField({ name: 'email', displayName: 'Email', type: Types.String }),
      mockField({ name: 'phone', displayName: 'Phone', type: Types.String }),
    ];
    const result = WrapperActionService.dissolveChoiceMembers(members, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({ key: '0', label: 'Email', selection: { memberIndex: 0 } }));
    expect(result[1]).toEqual(expect.objectContaining({ key: '1', label: 'Phone', selection: { memberIndex: 1 } }));
  });

  it('should dissolve abstract members into substitution candidates', () => {
    const abstractMember = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'ns:Cat': mockSubstituteInfo('Cat'),
      'ns:Dog': mockSubstituteInfo('Dog'),
    });

    const result = WrapperActionService.dissolveChoiceMembers([abstractMember], {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({
        key: '0:ns:Cat',
        label: 'Cat',
        selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
      }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        key: '0:ns:Dog',
        label: 'Dog',
        selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
      }),
    );
  });

  it('should skip sequence members', () => {
    const members = [
      mockField({ name: 'normal', displayName: 'Normal' }),
      mockField({ wrapperKind: 'sequence', name: 'seq' }),
    ];
    const result = WrapperActionService.dissolveChoiceMembers(members, {});

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Normal');
  });

  it('should include children preview for complex members', () => {
    const member = mockField({
      name: 'address',
      displayName: 'Address',
      type: Types.Container,
      fields: [mockField({ displayName: 'Street' }), mockField({ displayName: 'City' })],
    });
    const result = WrapperActionService.dissolveChoiceMembers([member], {});

    expect(result[0].childrenPreview).toEqual(['Street', 'City']);
  });

  it('should handle empty members list', () => {
    expect(WrapperActionService.dissolveChoiceMembers([], {})).toEqual([]);
  });
});

describe('buildAbstractCandidates', () => {
  it('should convert substitution candidates to WrapperCandidates', () => {
    const abstractField = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'ns:Cat': mockSubstituteInfo('Cat'),
      'ns:Dog': mockSubstituteInfo('Dog'),
    });

    const result = WrapperActionService.buildAbstractCandidates(abstractField, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      key: 'ns:Cat',
      label: 'Cat',
      typeBadge: Types.Container,
      selection: { memberIndex: 0, substituteQName: 'ns:Cat' },
    });
    expect(result[1]).toEqual({
      key: 'ns:Dog',
      label: 'Dog',
      typeBadge: Types.Container,
      selection: { memberIndex: 0, substituteQName: 'ns:Dog' },
    });
  });

  it('should return empty array when no candidates', () => {
    const abstractField = mockField({ wrapperKind: 'abstract' });
    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({});

    const result = WrapperActionService.buildAbstractCandidates(abstractField, {});
    expect(result).toEqual([]);
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

    const result = computeAddFieldCandidates(parent.fields, {}, []);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

    vi.spyOn(FieldOverrideService, 'getFieldSubstitutionCandidates').mockReturnValue({
      'ns:Concrete': mockSubstituteInfo('Concrete'),
    });
    vi.spyOn(WrapperActionService, 'resolveCandidateField').mockReturnValue(concreteChild);

    const result = computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [existingFieldItem]);

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

    const result = computeAddFieldCandidates(parent.fields, {}, []);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [], true);

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

    const result = computeAddFieldCandidates(parent.fields, {}, []);

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

    const result = computeAddFieldCandidates(parent.fields, {}, [], true);

    expect(result.candidates).toHaveLength(1);
    expect(result.fields[0]).toBe(collectionMember);
  });
});
