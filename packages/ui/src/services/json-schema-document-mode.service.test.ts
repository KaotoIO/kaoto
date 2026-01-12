import { DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document-model.service';

describe('JsonSchemaField.adopt()', () => {
  it('merges default value and choice metadata', () => {
    const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'doc');

    // valid parent for JsonSchemaField
    const parent = new JsonSchemaField(doc, 'root', Types.String);
    doc.fields.push(parent);

    // first adopt -> creates field
    const f1 = new JsonSchemaField(parent, 'key', Types.String);
    f1.defaultValue = 'initial';
    f1.isChoice = true;
    f1.choiceMembers = [];
    f1.selectedMemberIndex = 0;

    f1.adopt(parent);

    // second adopt -> merge
    const f2 = new JsonSchemaField(parent, 'key', Types.String);
    f2.defaultValue = 'updated';
    f2.isChoice = true;
    f2.choiceMembers = [new JsonSchemaField(parent, 'stub', Types.String)];
    f2.selectedMemberIndex = 1;

    const adopted = f2.adopt(parent) as JsonSchemaField;

    expect(adopted.defaultValue).toBe('updated');
    expect(adopted.isChoice).toBe(true);
    expect(adopted.choiceMembers?.length).toBe(1);
    expect(adopted.selectedMemberIndex).toBe(1);
  });
});
