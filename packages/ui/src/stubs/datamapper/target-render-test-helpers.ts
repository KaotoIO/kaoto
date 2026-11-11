import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import {
  CopyOfSelector,
  FieldItem,
  IfItem,
  MappingItem,
  MappingTree,
  ValueOfSelector,
} from '../../models/datamapper/mapping';
import {
  CopyOfFieldNodeData,
  FieldItemNodeData,
  IMappingLink,
  NodeData,
  TargetDocumentNodeData,
  TargetRenderIndex,
} from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../../services/document/document-util.service';
import { XmlSchemaDocument } from '../../services/document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../../services/document/xml-schema/xml-schema-document.service';
import { TargetRenderService } from '../../services/visualization/target-render.service';
import { TreeParsingService } from '../../services/visualization/tree-parsing.service';
import { VisualizationService } from '../../services/visualization/visualization.service';
import { getElementRefSingleRowXsd, getElementRefXsd } from './data-mapper';

/**
 * Asserts that `links` is not empty and that every link ends on a row of the target tree built from
 * `targetNodeData`, parsing collapsed subtrees along the way. A line whose target has no row is drawn
 * to the panel edge instead, which is the symptom of the tree and the lines disagreeing.
 * @param links - the mapping links to check
 * @param targetNodeData - the target document node the rendered tree is built from
 */
export const expectLinksOnRenderedRows = (links: IMappingLink[], targetNodeData: TargetDocumentNodeData): void => {
  expect(links.length).toBeGreaterThan(0);
  const tree = new DocumentTree(targetNodeData);
  for (const link of links) {
    expect(findRow(tree.root, link.targetNodePath)?.path).toEqual(link.targetNodePath);
  }
};

/**
 * Asserts that every see-through decision under `root` still matches `renderIndex`, i.e. that the
 * action under test didn't change a decision without asking for a structural refresh.
 * @param root - the mapping tree, or the part of it the action could have affected
 * @param renderIndex - the render index of the snapshot that is on screen
 */
export const expectNoDecisionChange = (root: MappingTree | MappingItem, renderIndex: TargetRenderIndex): void => {
  for (const ifItem of collectIfItems(root)) {
    const isSeeThrough = !!TargetRenderService.computeSeeThroughField(ifItem, renderIndex.sourceContext);
    expect(isSeeThrough).toBe(renderIndex.isAbsorbed(ifItem));
  }
};

/**
 * The target rows of `element-ref.xsd`'s `CSV`, built by the target tree builder against its
 * single-row variant on the source side ({@link createElementRefSingleRowCsvDocument}), so that each
 * guarded source is a single optional node. `STATUS` (Opt) and `CSV_r` (`0+`) are mapped behind
 * see-through optional guards, and `RPTID` (Opt) is mapped without one.
 */
export const createGuardedCsvRows = (): Record<
  'guardedOptional' | 'guardedRepeating' | 'unguardedOptional',
  FieldItemNodeData | CopyOfFieldNodeData
> => {
  const sourceBody = createElementRefSingleRowCsvDocument(DocumentType.SOURCE_BODY);
  const targetDoc = createElementRefCsvDocument(DocumentType.TARGET_BODY);
  const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  const csvItem = new FieldItem(mappingTree, targetDoc.fields[0]);
  mappingTree.children.push(csvItem);
  mapCsvField(csvItem, 'STATUS', true);
  mapCsvField(csvItem, 'CSV_r', true);
  mapCsvField(csvItem, 'RPTID', false);

  const renderIndex = TargetRenderService.buildIndex(mappingTree, { sourceParameterMap: new Map(), sourceBody });
  const [csvRow] = VisualizationService.generateStructuredDocumentChildren(
    new TargetDocumentNodeData(targetDoc, mappingTree, renderIndex),
  );
  const rows = VisualizationService.generateNonDocumentNodeDataChildren(csvRow);
  return {
    guardedOptional: findFieldItemRow(rows, 'STATUS'),
    guardedRepeating: findFieldItemRow(rows, 'CSV_r'),
    unguardedOptional: findFieldItemRow(rows, 'RPTID'),
  };
};

/**
 * The `element-ref.xsd` schema with `CSV` as its root element, whose `CSV_r` is a `0+` field and
 * whose other children are optional, for tests of optional guards.
 * @param documentType - the side and kind of document to create
 */
export const createElementRefCsvDocument = (documentType: DocumentType): XmlSchemaDocument =>
  createCsvDocument(documentType, 'element-ref.xsd', getElementRefXsd());

/**
 * The single-row variant of `element-ref.xsd`, with `CSV` as its root element: `CSV_r` is optional
 * and occurs at most once, so a path to it is an optional source. On the source side it feeds the
 * `0+` `CSV_r` of {@link createElementRefCsvDocument} from a single optional row.
 * @param documentType - the side and kind of document to create
 */
export const createElementRefSingleRowCsvDocument = (documentType: DocumentType): XmlSchemaDocument =>
  createCsvDocument(documentType, 'element-ref-single-row.xsd', getElementRefSingleRowXsd());

const createCsvDocument = (documentType: DocumentType, fileName: string, content: string): XmlSchemaDocument => {
  const { document } = XmlSchemaDocumentService.createXmlSchemaDocument(
    new DocumentDefinition(
      documentType,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { [fileName]: content },
      { namespaceUri: '', name: 'CSV' },
    ),
  );
  if (!document) throw new Error(`${fileName} did not produce a document`);
  return document;
};

const mapCsvField = (csvItem: FieldItem, name: string, isGuarded: boolean): void => {
  const field = csvItem.field.fields.find((child) => child.name === name);
  if (!field) throw new Error(`CSV has no field ${name}`);
  const sourcePath = `/CSV/${name}`;
  let parent: FieldItem | IfItem = csvItem;
  if (isGuarded) {
    parent = new IfItem(csvItem);
    parent.expression = sourcePath;
    csvItem.children.push(parent);
  }
  DocumentUtilService.resolveTypeFragment(field);
  if (field.fields.length > 0) {
    // A container is copied wholesale by a bare copy-of, drawn on the field's row.
    const copyOf = new CopyOfSelector(parent);
    copyOf.expression = sourcePath;
    parent.children.push(copyOf);
    return;
  }
  const fieldItem = new FieldItem(parent, field);
  parent.children.push(fieldItem);
  const selector = new ValueOfSelector(fieldItem);
  selector.expression = sourcePath;
  fieldItem.children.push(selector);
};

const findFieldItemRow = (rows: NodeData[], name: string): FieldItemNodeData | CopyOfFieldNodeData => {
  const row = rows.find(
    (node) => (node instanceof FieldItemNodeData || node instanceof CopyOfFieldNodeData) && node.field.name === name,
  );
  if (!(row instanceof FieldItemNodeData || row instanceof CopyOfFieldNodeData)) {
    throw new TypeError(`CSV has no mapped row for ${name}`);
  }
  return row;
};

const findRow = (root: DocumentTreeNode, path: string): DocumentTreeNode | undefined => {
  let node: DocumentTreeNode | undefined = root;
  while (node && node.path !== path) {
    if (!node.isParsed) TreeParsingService.parseTreeNode(node);
    node = node.children.find((child) => child.path === path || path.startsWith(`${child.path}/`));
  }
  return node;
};

const collectIfItems = (item: MappingTree | MappingItem): IfItem[] => {
  const ifItems: IfItem[] = item instanceof IfItem ? [item] : [];
  for (const child of item.children) {
    ifItems.push(...collectIfItems(child));
  }
  return ifItems;
};

/**
 * The row of `CSV_r`, a container mapped by a bare copy-of inside a see-through optional guard, so it is
 * drawn as a copy-of row that absorbs the guard.
 */
export const createGuardedCsvCopyOfRow = (): CopyOfFieldNodeData => {
  const row = createGuardedCsvRows().guardedRepeating;
  if (!(row instanceof CopyOfFieldNodeData)) throw new TypeError('CSV_r should be drawn as a copy-of row');
  return row;
};
