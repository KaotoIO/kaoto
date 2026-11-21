import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  RootElementOption,
} from '../../models/datamapper/document';
import { ForEachItem, MappingTree } from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
} from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../../services/document/document-util.service';
import { XmlSchemaDocument } from '../../services/document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../../services/document/xml-schema/xml-schema-document.service';
import { ChoiceFieldService } from '../../services/visualization/choice-field.service';
import { VisualizationService } from '../../services/visualization/visualization.service';

export const NS_POC = 'io.kaoto.datamapper.poc.test';
const NS_P = 'urn:p';
export const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';
export const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';
export const NOTIFICATION = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };

export const parseXsdDocument = (
  documentType: DocumentType,
  fileName: string,
  content: string,
  rootElement?: RootElementOption,
): XmlSchemaDocument => {
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(
    new DocumentDefinition(
      documentType,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { [fileName]: content },
      rootElement,
    ),
  );
  if (!result.document) throw new Error(`${fileName} did not parse`);
  return result.document;
};

export const createTargetTree = (document: XmlSchemaDocument, namespaceMap: Record<string, string>): MappingTree => {
  const tree = new MappingTree(document.documentType, document.documentId, DocumentDefinitionType.XML_SCHEMA);
  tree.namespaceMap = namespaceMap;
  return tree;
};

export const documentRows = (document: XmlSchemaDocument, tree?: MappingTree): NodeData[] =>
  VisualizationService.generateStructuredDocumentChildren(
    tree ? new TargetDocumentNodeData(document, tree) : new DocumentNodeData(document),
  );

export const rowsOf = (node: NodeData): NodeData[] => VisualizationService.generateNonDocumentNodeDataChildren(node);

const rowField = (node: NodeData): IField | undefined =>
  node instanceof FieldNodeData || node instanceof FieldItemNodeData ? node.field : undefined;

export const rowNamed = (node: NodeData, name: string): NodeData => {
  const row = rowsOf(node).find((child) => rowField(child)?.name === name);
  if (!row) throw new Error(`No row named ${name}`);
  return row;
};

export const rowWhere = (node: NodeData, predicate: (child: NodeData) => boolean, label: string): NodeData => {
  const row = rowsOf(node).find(predicate);
  if (!row) throw new Error(`No row ${label}`);
  return row;
};

export const descendantRow = (node: NodeData, predicate: (row: NodeData) => boolean, label: string): NodeData => {
  const queue: NodeData[] = rowsOf(node);
  for (const row of queue) {
    if (predicate(row)) return row;
    queue.push(...rowsOf(row));
  }
  throw new Error(`No row ${label}`);
};

export const findField = (parent: IField | XmlSchemaDocument, name: string): IField => {
  const queue: IField[] = [...parent.fields];
  for (const field of queue) {
    if (field.name === name) return field;
    DocumentUtilService.resolveTypeFragment(field);
    queue.push(...field.fields);
  }
  throw new Error(`No field named ${name}`);
};

export const repeatingChoiceOf = (parent: IField): IField => {
  const choice = parent.fields.find((field) => field.wrapperKind === 'choice' && field.maxOccurs === 'unbounded');
  if (!choice) throw new Error(`No repeating choice under ${parent.name}`);
  return choice;
};

export const forEachRow = (parent: NodeData): NodeData =>
  rowWhere(parent, (row) => row instanceof MappingNodeData && row.mapping instanceof ForEachItem, 'for-each');

/**
 * Parses a target schema whose root holds a non-repeating `xs:choice` and selects its first member, as the
 * Field Context Menu does. Used with `ChoiceRepeatingMember.xsd` and `ChoiceRepeatingContainerMember.xsd`.
 */
export const selectFirstChoiceMember = (
  xsdName: string,
  xsd: string,
): { doc: XmlSchemaDocument; tree: MappingTree } => {
  const doc = parseXsdDocument(DocumentType.TARGET_BODY, xsdName, xsd);
  const tree = createTargetTree(doc, { ns0: NS_P });
  const choiceRow = rowWhere(
    documentRows(doc, tree)[0],
    (row) => row instanceof TargetChoiceFieldNodeData,
    'for the choice',
  );
  ChoiceFieldService.dispatchChoiceSelection(
    choiceRow,
    findField(doc, '__choice__'),
    { memberIndex: 0 },
    tree.namespaceMap,
    true,
  );
  return { doc, tree };
};
