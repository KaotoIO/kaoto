import { XmlSchemaDocument, XmlSchemaField } from '../../services/document/xml-schema/xml-schema-document.model';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { BaseField, DocumentDefinition, DocumentDefinitionType, DocumentType } from './document';

describe('BaseField.adopt()', () => {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'doc');
  const collection = new XmlSchemaCollection();
  const doc = new XmlSchemaDocument(definition, collection);

  it('should copy choice metadata and member fields when creating a new adopted field', () => {
    const parent = new XmlSchemaField(doc, 'root', false);
    doc.fields.push(parent);

    const field = new BaseField(parent, doc, 'child');
    field.wrapperKind = 'choice';
    field.selectedMemberIndex = 1;
    const memberA = new BaseField(field, doc, 'memberA');
    const memberB = new BaseField(field, doc, 'memberB');
    field.fields = [memberA, memberB];

    const adopted = field.adopt(parent);

    expect(adopted.wrapperKind).toBe('choice');
    expect(adopted.selectedMemberIndex).toBe(1);
    expect(adopted.fields.length).toBe(2);
    expect(adopted.fields[0].name).toBe('memberA');
    expect(adopted.fields[1].name).toBe('memberB');
  });

  it('should merge choice metadata and member fields into an existing identical field', () => {
    const parent = new XmlSchemaField(doc, 'parent', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'same');
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'same');
    second.wrapperKind = 'choice';
    second.selectedMemberIndex = 2;
    const memberX = new BaseField(second, doc, 'memberX');
    second.fields = [memberX];

    const merged = second.adopt(parent);

    expect(merged.wrapperKind).toBe('choice');
    expect(merged.selectedMemberIndex).toBe(2);
    expect(merged.fields.length).toBe(1);
    expect(merged.fields[0].name).toBe('memberX');
  });

  it('should leave choice metadata and fields untouched when source has none', () => {
    const parent = new XmlSchemaField(doc, 'parent2', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'noChoice');
    first.wrapperKind = 'choice';
    first.selectedMemberIndex = 0;
    const memberKeep = new BaseField(first, doc, 'memberKeep');
    first.fields = [memberKeep];
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'noChoice');
    const merged = second.adopt(parent);

    expect(merged.wrapperKind).toBe('choice');
    expect(merged.selectedMemberIndex).toBe(0);
    expect(merged.fields.length).toBe(1);
    expect(merged.fields[0].name).toBe('memberKeep');
  });
});

describe('BaseField.adopt() - abstract metadata', () => {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'doc');
  const collection = new XmlSchemaCollection();
  const doc = new XmlSchemaDocument(definition, collection);

  it('should copy wrapperKind and isAbstractType when creating a new adopted field', () => {
    const parent = new XmlSchemaField(doc, 'root', false);
    doc.fields.push(parent);

    const field = new BaseField(parent, doc, 'abstract-wrapper');
    field.wrapperKind = 'abstract';
    field.isAbstractType = true;
    const candidateA = new BaseField(field, doc, 'candidateA');
    field.fields = [candidateA];

    const adopted = field.adopt(parent);

    expect(adopted.wrapperKind).toBe('abstract');
    expect(adopted.isAbstractType).toBe(true);
    expect(adopted.fields.length).toBe(1);
    expect(adopted.fields[0].name).toBe('candidateA');
  });

  it('should merge wrapperKind and isAbstractType into an existing identical field', () => {
    const parent = new XmlSchemaField(doc, 'parent-merge', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'same');
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'same');
    second.wrapperKind = 'abstract';
    second.isAbstractType = true;

    const merged = second.adopt(parent);

    expect(merged.wrapperKind).toBe('abstract');
    expect(merged.isAbstractType).toBe(true);
  });

  it('should leave abstract metadata untouched when source has none', () => {
    const parent = new XmlSchemaField(doc, 'parent-keep', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'keepAbstract');
    first.wrapperKind = 'abstract';
    first.isAbstractType = true;
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'keepAbstract');
    const merged = second.adopt(parent);

    expect(merged.wrapperKind).toBe('abstract');
    expect(merged.isAbstractType).toBe(true);
  });
});

describe('XmlSchemaField.adopt()', () => {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'doc');
  const collection = new XmlSchemaCollection();
  const doc = new XmlSchemaDocument(definition, collection);

  it('should copy choice metadata and member fields when adopting into a new field', () => {
    const parent = new XmlSchemaField(doc, 'root', false);
    doc.fields.push(parent);

    const field = new XmlSchemaField(parent, 'element', false);
    field.wrapperKind = 'choice';
    field.selectedMemberIndex = 1;
    const memberA = new XmlSchemaField(field, 'memberA', false);
    const memberB = new XmlSchemaField(field, 'memberB', false);
    field.fields = [memberA, memberB];

    const adopted = field.adopt(parent);

    expect(adopted.wrapperKind).toBe('choice');
    expect(adopted.selectedMemberIndex).toBe(1);
    expect(adopted.fields.length).toBe(2);
    expect(adopted.fields[0].name).toBe('memberA');
    expect(adopted.fields[1].name).toBe('memberB');
  });

  it('should copy wrapperKind and isAbstractType when adopting into a new field', () => {
    const parent = new XmlSchemaField(doc, 'root-abstract', false);
    doc.fields.push(parent);

    const field = new XmlSchemaField(parent, 'abstract-element', false);
    field.wrapperKind = 'abstract';
    field.isAbstractType = true;
    const candidateA = new XmlSchemaField(field, 'candidateA', false);
    const candidateB = new XmlSchemaField(field, 'candidateB', false);
    field.fields = [candidateA, candidateB];

    const adopted = field.adopt(parent);

    expect(adopted.wrapperKind).toBe('abstract');
    expect(adopted.isAbstractType).toBe(true);
    expect(adopted.fields.length).toBe(2);
    expect(adopted.fields[0].name).toBe('candidateA');
    expect(adopted.fields[1].name).toBe('candidateB');
  });
});
