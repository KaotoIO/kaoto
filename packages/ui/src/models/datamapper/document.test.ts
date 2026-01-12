import { BaseField, DocumentDefinitionType, DocumentType, IDocument } from './document';
import { NodePath } from './nodepath';

function createMockDocument(): IDocument {
  return {
    documentType: DocumentType.SOURCE_BODY,
    documentId: 'doc',
    name: 'doc',
    definitionType: DocumentDefinitionType.Primitive,
    fields: [],
    path: NodePath.fromDocument(DocumentType.SOURCE_BODY, 'doc'),
    namedTypeFragments: {},
    totalFieldCount: 0,
    isNamespaceAware: false,
    getReferenceId: () => '',
    getExpression: () => '',
  };
}

describe('BaseField Adopt', () => {
  it('should preserve choice metadata when adopting into an existing field', () => {
    const document = createMockDocument();

    const parent = new BaseField(document, document, 'parent');
    document.fields.push(parent);

    const field = new BaseField(parent, document, 'child');
    field.isChoice = true;
    field.choiceMembers = [];
    field.selectedMemberIndex = 1;

    // First adopt -> creates field
    field.adopt(parent);

    // Second adopt -> merges into existing
    const adopted = field.adopt(parent);

    expect(adopted.isChoice).toBe(true);
    expect(adopted.choiceMembers).toEqual([]);
    expect(adopted.selectedMemberIndex).toBe(1);
  });
});
