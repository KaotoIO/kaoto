import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper';
import { FieldItem, MappingTree } from '../../../../models/datamapper/mapping';
import { TargetDocumentNodeData, TargetFieldNodeData } from '../../../../models/datamapper/visualization';
import { XmlSchemaDocumentService } from '../../../../services/document/xml-schema/xml-schema-document.service';
import { getFieldSubstitutionXsd } from '../../../../stubs/datamapper/data-mapper';
import { applyTargetSelection, clearTargetSelection } from './target-field-item-utils';

const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

function createTargetSetup() {
  const definition = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
  });
  definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' };
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (!result.document) throw new Error('Failed to create test document');
  const document = result.document;

  const mappingTree = new MappingTree(document.documentType, document.documentId, DocumentDefinitionType.XML_SCHEMA);
  const docNode = new TargetDocumentNodeData(document, mappingTree);
  const zooField = document.fields[0];
  const fieldNode = new TargetFieldNodeData(docNode, zooField);

  return { document, mappingTree, docNode, zooField, fieldNode };
}

describe('applyTargetSelection', () => {
  it('should create new FieldItem when no existing mapping exists', () => {
    const { mappingTree, fieldNode, zooField } = createTargetSetup();
    const candidateField = zooField.fields[0];

    applyTargetSelection(fieldNode, candidateField);

    expect(mappingTree.children).toHaveLength(1);
    const created = mappingTree.children[0] as FieldItem;
    expect(created).toBeInstanceOf(FieldItem);
    expect(created.field).toBe(candidateField);
    expect(created.isUserCreated).toBe(true);
  });

  it('should replace existing FieldItem field when mapping already exists', () => {
    const { mappingTree, fieldNode, zooField } = createTargetSetup();
    const existingItem = new FieldItem(mappingTree, zooField);
    existingItem.isUserCreated = true;
    mappingTree.children.push(existingItem);
    fieldNode.mapping = existingItem;

    const candidateField = zooField.fields[0];
    applyTargetSelection(fieldNode, candidateField);

    expect(mappingTree.children).toHaveLength(1);
    const replaced = mappingTree.children[0] as FieldItem;
    expect(replaced.field).toBe(candidateField);
    expect(replaced.isUserCreated).toBe(true);
  });
});

describe('clearTargetSelection', () => {
  it('should remove children and replace field on existing FieldItem', () => {
    const { mappingTree, fieldNode, zooField } = createTargetSetup();
    const candidateField = zooField.fields[0];
    const existingItem = new FieldItem(mappingTree, candidateField);
    existingItem.isUserCreated = true;
    const childItem = new FieldItem(existingItem, candidateField.fields[0]);
    existingItem.children.push(childItem);
    mappingTree.children.push(existingItem);
    fieldNode.mapping = existingItem;

    clearTargetSelection(fieldNode, zooField);

    expect(mappingTree.children).toHaveLength(1);
    const replaced = mappingTree.children[0] as FieldItem;
    expect(replaced.field).toBe(zooField);
    expect(replaced.isUserCreated).toBe(true);
    expect(replaced.children).toHaveLength(0);
  });

  it('should be no-op when no existing mapping', () => {
    const { mappingTree, fieldNode, zooField } = createTargetSetup();

    clearTargetSelection(fieldNode, zooField);

    expect(mappingTree.children).toHaveLength(0);
  });
});
