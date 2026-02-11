import { XmlSchemaDocument, XmlSchemaField } from '../../services/xml-schema-document.model';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { BaseField, DocumentDefinition, DocumentDefinitionType, DocumentType } from './document';

describe('BaseField.adopt()', () => {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'doc');
  const collection = new XmlSchemaCollection();
  const doc = new XmlSchemaDocument(definition, collection);

  it('should copy choice metadata when creating a new adopted field', () => {
    const parent = new XmlSchemaField(doc, 'root', false);
    doc.fields.push(parent);

    const field = new BaseField(parent, doc, 'child');
    field.isChoice = true;
    field.choiceMembers = [];
    field.selectedMemberIndex = 1;

    const adopted = field.adopt(parent);

    expect(adopted.isChoice).toBe(true);
    expect(adopted.choiceMembers).toEqual([]);
    expect(adopted.selectedMemberIndex).toBe(1);
  });

  it('should merge choice metadata into an existing identical field', () => {
    const parent = new XmlSchemaField(doc, 'parent', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'same');
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'same');
    second.isChoice = true;
    second.choiceMembers = [];
    second.selectedMemberIndex = 2;

    const merged = second.adopt(parent);

    expect(merged.isChoice).toBe(true);
    expect(merged.choiceMembers).toEqual([]);
    expect(merged.selectedMemberIndex).toBe(2);
  });

  it('should leave choice metadata untouched when source has none', () => {
    const parent = new XmlSchemaField(doc, 'parent2', false);
    doc.fields.push(parent);

    const first = new BaseField(parent, doc, 'noChoice');
    first.isChoice = true;
    first.choiceMembers = [];
    first.selectedMemberIndex = 0;
    first.adopt(parent);

    const second = new BaseField(parent, doc, 'noChoice');
    const merged = second.adopt(parent);

    expect(merged.isChoice).toBe(true);
    expect(merged.choiceMembers).toEqual([]);
    expect(merged.selectedMemberIndex).toBe(0);
  });
});

describe('XmlSchemaField.adopt()', () => {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'doc');
  const collection = new XmlSchemaCollection();
  const doc = new XmlSchemaDocument(definition, collection);

  it('should copy choice metadata when adopting into a new field', () => {
    const parent = new XmlSchemaField(doc, 'root', false);
    doc.fields.push(parent);

    const field = new XmlSchemaField(parent, 'element', false);
    field.isChoice = true;
    field.choiceMembers = [];
    field.selectedMemberIndex = 1;

    const adopted = field.adopt(parent);

    expect(adopted.isChoice).toBe(true);
    expect(adopted.choiceMembers).toEqual([]);
    expect(adopted.selectedMemberIndex).toBe(1);
  });
});
