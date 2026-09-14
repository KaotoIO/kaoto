import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { FieldItemNodeData, TargetDocumentNodeData, TargetFieldNodeData } from '../../models/datamapper/visualization';
import { MappingService } from '../../services/mapping/mapping.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { getFieldSubstitutionXsd, getWideDeepXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { FieldOverrideService } from '../document/field-override.service';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { AbstractFieldService } from './abstract-field.service';
import { MappingActionService } from './mapping-action.service';
import { TreeParsingService } from './tree-parsing.service';
import { TreeUIService } from './tree-ui.service';

/** Create a wide+deep target document from WideDeep.xsd. */
function createWideDeepTargetDoc() {
  const definition = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.XML_SCHEMA,
    BODY_DOCUMENT_ID,
    { 'wide-deep.xsd': getWideDeepXsd() },
  );
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create wide+deep doc');
  }
  return result.document;
}

describe('TreeUIService — deep expansion preservation (issue #3811)', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TreeUIService as any).trees.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TreeUIService as any).fieldItemSnapshots.clear();
    useDocumentTreeStore.setState({ expansionState: {}, expansionStateArray: {} });
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TreeUIService as any).trees.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TreeUIService as any).fieldItemSnapshots.clear();
    useDocumentTreeStore.setState({ expansionState: {}, expansionStateArray: {} });
  });

  /**
   * The load-bearing regression test.
   *
   * Verifies that descendants of a transitioning node that sit BELOW the parse frontier
   * keep their expansion state across a mapping create → remove round-trip.
   *
   * Schema shape:  WideDeep (content root, L0)
   *                 ├─ wide_01..wide_09 (L1, each with 10 leaf children = 90 L2 nodes)
   *                 └─ deep_chain (L1) → L2 → L3 → L4 → L5leaf
   *
   * With INITIAL_FIELD_COUNTS=100 and INITIAL_PARSE_DEPTH=3:
   * - WideDeep (1) + wide_01..wide_09 (9×11=99) = 100 nodes consume the budget before
   *   the deep chain's L3/L4 are visited.
   * - The transitioning node is `WideDeep` (the content root itself) which is always
   *   within the frontier (depth 0).
   * - deep_chain and its descendants sit under WideDeep and are expanded by the test
   *   via toggleNode before the mapping create, producing deep store keys.
   *
   * §7c confirmed: on unfixed code, 0 of N deep keys survived. The fix must preserve all N.
   */
  it('should preserve deep descendant expansion after mapping create on a frontier-visible field', () => {
    const targetDoc = createWideDeepTargetDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;

    const wideDeepRoot = tree1.contentRoots[0];
    expect(wideDeepRoot).toBeDefined();
    expect(wideDeepRoot.nodeData.title).toBe('WideDeep');
    expect(wideDeepRoot.nodeData).toBeInstanceOf(TargetFieldNodeData);
    const oldWideDeepPath = wideDeepRoot.path;

    const deepChainNode = wideDeepRoot.children.find((c) => c.nodeData.title === 'deep_chain');
    expect(deepChainNode).toBeDefined();
    if (!deepChainNode!.isParsed) TreeParsingService.parseTreeNode(deepChainNode!); // add L2
    const l2Node = deepChainNode!.children[0];
    expect(l2Node).toBeDefined();
    if (!l2Node.isParsed) TreeParsingService.parseTreeNode(l2Node); // add L3
    const l3Node = l2Node.children[0];
    expect(l3Node).toBeDefined();

    // Inject L3 as a below-frontier expansion key directly into the store.
    const existingExpansion = useDocumentTreeStore.getState().expansionState[documentId];
    useDocumentTreeStore.getState().setTreeExpansion(documentId, {
      ...existingExpansion,
      [l3Node.path]: true, // ← genuinely below-frontier key
    });

    const expansionSnapshot = { ...useDocumentTreeStore.getState().expansionState[documentId] };
    const deepKeysBefore = Object.keys(expansionSnapshot).filter(
      (k) => k === oldWideDeepPath || k.startsWith(oldWideDeepPath + '/'),
    );
    expect(deepKeysBefore.some((k) => k === l3Node.path)).toBe(true);

    // Create a mapping on WideDeep: TargetFieldNodeData → FieldItemNodeData transition
    const wideDeepField = (wideDeepRoot.nodeData as TargetFieldNodeData).field;
    MappingService.createFieldItem(mappingTree, wideDeepField);

    const newMappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    newMappingTree.children = mappingTree.children.map((child) => {
      child.parent = newMappingTree;
      return child;
    });
    const targetDocNode2 = new TargetDocumentNodeData(targetDoc, newMappingTree);
    const tree2 = TreeUIService.createTree(targetDocNode2);

    const newWideDeepRoot = tree2.contentRoots.find(
      (r) => r.nodeData instanceof FieldItemNodeData && (r.nodeData as FieldItemNodeData).field === wideDeepField,
    );
    expect(newWideDeepRoot).toBeDefined();
    const newWideDeepPath = newWideDeepRoot!.path;
    expect(newWideDeepPath).not.toBe(oldWideDeepPath);

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];
    const l3NewPath = newWideDeepPath + l3Node.path.slice(oldWideDeepPath.length);

    // CORE ASSERTION: the below-frontier L3 key must survive with its value.
    expect(expansionAfter[l3NewPath]).toBe(true);

    // Every key that was under the old prefix must now exist under the new prefix,
    // preserving its exact value.
    for (const oldKey of deepKeysBefore) {
      const newKey = newWideDeepPath + oldKey.slice(oldWideDeepPath.length);
      expect(newKey in expansionAfter).toBe(true);
      expect(expansionAfter[newKey]).toBe(expansionSnapshot[oldKey]);
    }

    // No stale keys under the old field.id prefix
    const staleKeys = Object.keys(expansionAfter).filter(
      (k) => k === oldWideDeepPath || k.startsWith(oldWideDeepPath + '/'),
    );
    expect(staleKeys).toHaveLength(0);
  });

  it('should preserve deep descendant expansion after mapping remove (reverse transition)', () => {
    const targetDoc = createWideDeepTargetDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;

    const wideDeepRoot = tree1.contentRoots[0];
    expect(wideDeepRoot).toBeDefined();
    const wideDeepField = (wideDeepRoot.nodeData as TargetFieldNodeData).field;
    const fieldItem = MappingService.createFieldItem(mappingTree, wideDeepField);

    const mappingTree2 = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    mappingTree2.children = mappingTree.children.map((child) => {
      child.parent = mappingTree2;
      return child;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, mappingTree2));

    const mappedRoot = tree2.contentRoots.find(
      (r) => r.nodeData instanceof FieldItemNodeData && (r.nodeData as FieldItemNodeData).field === wideDeepField,
    );
    expect(mappedRoot).toBeDefined();
    const mappedPath = mappedRoot!.path;

    if (!mappedRoot!.isParsed) TreeParsingService.parseTreeNode(mappedRoot!);
    const deepChainMapped = mappedRoot!.children.find((c) => c.nodeData.title === 'deep_chain');
    expect(deepChainMapped).toBeDefined();
    TreeUIService.toggleNode(documentId, deepChainMapped!.path);
    if (!deepChainMapped!.isParsed) TreeParsingService.parseTreeNode(deepChainMapped!);
    const l2 = deepChainMapped!.children[0];
    TreeUIService.toggleNode(documentId, l2.path);
    if (!l2.isParsed) TreeParsingService.parseTreeNode(l2);
    const l3 = l2.children[0];
    TreeUIService.toggleNode(documentId, l3.path); // below frontier

    const expansionBeforeRemove = { ...useDocumentTreeStore.getState().expansionState[documentId] };
    const deepKeysUnderMapped = Object.keys(expansionBeforeRemove).filter(
      (k) => k === mappedPath || k.startsWith(mappedPath + '/'),
    );
    expect(deepKeysUnderMapped.length).toBeGreaterThan(0);

    const mappingTree3 = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    mappingTree3.children = mappingTree2.children
      .filter((child) => child !== fieldItem)
      .map((child) => {
        child.parent = mappingTree3;
        return child;
      });
    const tree3 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, mappingTree3));

    const unmappedRoot = tree3.contentRoots[0];
    expect(unmappedRoot).toBeDefined();
    expect(unmappedRoot.nodeData).toBeInstanceOf(TargetFieldNodeData);
    expect(unmappedRoot.nodeData.title).toBe('WideDeep');
    const unmappedPath = unmappedRoot.path;

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];
    for (const oldKey of deepKeysUnderMapped) {
      const newKey = unmappedPath + oldKey.slice(mappedPath.length);
      expect(newKey in expansionAfter).toBe(true);
      expect(expansionAfter[newKey]).toBe(expansionBeforeRemove[oldKey]);
    }

    const staleKeys = Object.keys(expansionAfter).filter((k) => k === mappedPath || k.startsWith(mappedPath + '/'));
    expect(staleKeys).toHaveLength(0);
  });

  it('should perform a full create → remove round-trip preserving expansion throughout', () => {
    const targetDoc = createWideDeepTargetDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;

    const wideDeepRoot = tree1.contentRoots[0];
    expect(wideDeepRoot).toBeDefined();
    const originalPath = wideDeepRoot.path;

    const deepChainNode = wideDeepRoot.children.find((c) => c.nodeData.title === 'deep_chain');
    expect(deepChainNode).toBeDefined();
    if (!deepChainNode!.isParsed) TreeParsingService.parseTreeNode(deepChainNode!);
    const l2 = deepChainNode!.children[0];
    if (!l2.isParsed) TreeParsingService.parseTreeNode(l2);
    const l3 = l2.children[0];
    expect(l3).toBeDefined();

    useDocumentTreeStore.getState().setTreeExpansion(documentId, {
      ...useDocumentTreeStore.getState().expansionState[documentId],
      [l3.path]: true,
    });

    const originalDeepKeys = Object.keys(useDocumentTreeStore.getState().expansionState[documentId]).filter(
      (k) => k === originalPath || k.startsWith(originalPath + '/'),
    );
    expect(originalDeepKeys.some((k) => k === l3.path)).toBe(true);

    const wideDeepField = (wideDeepRoot.nodeData as TargetFieldNodeData).field;
    const fieldItem = MappingService.createFieldItem(mappingTree, wideDeepField);

    const mt2 = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    mt2.children = mappingTree.children.map((c) => {
      c.parent = mt2;
      return c;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, mt2));

    const mappedRoot = tree2.contentRoots.find(
      (r) => r.nodeData instanceof FieldItemNodeData && (r.nodeData as FieldItemNodeData).field === wideDeepField,
    );
    expect(mappedRoot).toBeDefined();
    const mappedPath = mappedRoot!.path;

    const l3MappedPath = mappedPath + l3.path.slice(originalPath.length);
    expect(useDocumentTreeStore.getState().expansionState[documentId][l3MappedPath]).toBe(true);

    const mt3 = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    mt3.children = mt2.children
      .filter((c) => c !== fieldItem)
      .map((c) => {
        c.parent = mt3;
        return c;
      });
    const tree3 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, mt3));

    const restoredRoot = tree3.contentRoots[0];
    expect(restoredRoot).toBeDefined();
    expect(restoredRoot.nodeData).toBeInstanceOf(TargetFieldNodeData);
    const restoredPath = restoredRoot.path;

    const l3RestoredPath = restoredPath + l3.path.slice(originalPath.length);
    expect(useDocumentTreeStore.getState().expansionState[documentId][l3RestoredPath]).toBe(true);

    expect(
      Object.keys(useDocumentTreeStore.getState().expansionState[documentId]).filter(
        (k) => k === mappedPath || k.startsWith(mappedPath + '/'),
      ),
    ).toHaveLength(0);
  });

  it('should NOT migrate when a collection field has multiple mappings (multi-sibling skip)', () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;
    const store = useDocumentTreeStore.getState();

    const shipOrderRoot = tree1.contentRoots[0];
    expect(shipOrderRoot).toBeDefined();
    if (!shipOrderRoot.isParsed) TreeParsingService.parseTreeNode(shipOrderRoot);
    const itemNode = shipOrderRoot.children.find((c) => c.nodeData.title === 'Item');
    expect(itemNode).toBeDefined();
    if (!itemNode!.isParsed) TreeParsingService.parseTreeNode(itemNode!);
    const itemField = (itemNode!.nodeData as TargetFieldNodeData).field;
    const itemPath = itemNode!.path;

    TreeUIService.toggleNode(documentId, itemPath);
    expect(store.isExpanded(documentId, itemPath)).toBe(false);

    const shipOrderField = (shipOrderRoot.nodeData as TargetFieldNodeData).field;
    MappingService.createFieldItem(mappingTree, shipOrderField);
    const shipOrderFieldItem = mappingTree.children[0];
    MappingService.createFieldItem(shipOrderFieldItem, itemField);
    MappingService.createFieldItem(shipOrderFieldItem, itemField);

    const newMappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    newMappingTree.children = mappingTree.children.map((child) => {
      child.parent = newMappingTree;
      return child;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, newMappingTree));

    const shipOrderRoot2 = tree2.contentRoots[0];
    if (!shipOrderRoot2.isParsed) TreeParsingService.parseTreeNode(shipOrderRoot2);
    const mappedSiblings = shipOrderRoot2.children.filter(
      (c) => c.nodeData instanceof FieldItemNodeData && c.nodeData.title === 'Item',
    );
    expect(mappedSiblings.length).toBeGreaterThanOrEqual(2);
    expect(store.isExpanded(documentId, mappedSiblings[0].path)).toBe(true);
    expect(store.isExpanded(documentId, mappedSiblings[1].path)).toBe(true);
  });

  it('should prune orphaned expansion keys (verbatim carry-over with prune — §4.3 memory guard)', () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const documentId = targetDocNode.id;

    const BOGUS_PREFIX = 'targetBody:Body://fx-DEAD-0000';
    useDocumentTreeStore.getState().setTreeExpansion(documentId, {
      [BOGUS_PREFIX]: true,
      [`${BOGUS_PREFIX}/fx-Child-1111`]: true,
      [`${BOGUS_PREFIX}/fx-Child-1111/fx-GrandChild-2222`]: false,
    });

    TreeUIService.createTree(targetDocNode);

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];
    expect(expansionAfter[BOGUS_PREFIX]).toBeUndefined();
    expect(expansionAfter[`${BOGUS_PREFIX}/fx-Child-1111`]).toBeUndefined();
    expect(expansionAfter[`${BOGUS_PREFIX}/fx-Child-1111/fx-GrandChild-2222`]).toBeUndefined();
    expect(Object.keys(expansionAfter).length).toBeGreaterThan(0);
  });

  /**
   * Exact reproduction of the user-reported scenario:
   * expand ShipTo children via toggleNode, then create first mapping on Name
   * (which transitions ShipOrder→ShipTo→Name to FieldItemNodeData via getOrCreateFieldItem).
   * Address/City/Country — siblings of Name that stay as TargetFieldNodeData — must remain expanded.
   */
  it('should keep ShipTo children expanded after first mapping on Name', () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;
    const store = useDocumentTreeStore.getState();

    const shipOrderRoot = tree1.contentRoots[0];
    expect(shipOrderRoot.nodeData.title).toBe('ShipOrder');

    const shipToNode = shipOrderRoot.children.find((c) => c.nodeData.title === 'ShipTo');
    expect(shipToNode).toBeDefined();
    if (!shipToNode!.isParsed) TreeParsingService.parseTreeNode(shipToNode!);
    expect(shipToNode!.children.length).toBeGreaterThan(0);

    if (!store.isExpanded(documentId, shipToNode!.path)) {
      TreeUIService.toggleNode(documentId, shipToNode!.path);
    }
    for (const child of shipToNode!.children) {
      if (!store.isExpanded(documentId, child.path)) {
        TreeUIService.toggleNode(documentId, child.path);
      }
      expect(store.isExpanded(documentId, child.path)).toBe(true);
    }

    const nameNode = shipToNode!.children.find((c) => c.nodeData.title === 'Name');
    expect(nameNode).toBeDefined();
    MappingActionService.getOrCreateFieldItem(nameNode!.nodeData as TargetFieldNodeData);

    const newMappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    newMappingTree.children = mappingTree.children.map((child) => {
      child.parent = newMappingTree;
      return child;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, newMappingTree));

    const newShipOrderRoot = tree2.contentRoots[0];
    expect(newShipOrderRoot.nodeData).toBeInstanceOf(FieldItemNodeData);

    if (!newShipOrderRoot.isParsed) TreeParsingService.parseTreeNode(newShipOrderRoot);
    const newShipToNode = newShipOrderRoot.children.find((c) => c.nodeData.title === 'ShipTo');
    expect(newShipToNode).toBeDefined();
    expect(newShipToNode!.nodeData).toBeInstanceOf(FieldItemNodeData);

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];
    expect(expansionAfter[newShipToNode!.path]).toBe(true);

    if (!newShipToNode!.isParsed) TreeParsingService.parseTreeNode(newShipToNode!);
    const newAddressNode = newShipToNode!.children.find((c) => c.nodeData.title === 'Address');
    const newCityNode = newShipToNode!.children.find((c) => c.nodeData.title === 'City');
    const newCountryNode = newShipToNode!.children.find((c) => c.nodeData.title === 'Country');
    expect(newAddressNode).toBeDefined();
    expect(newCityNode).toBeDefined();
    expect(newCountryNode).toBeDefined();

    expect(expansionAfter[newAddressNode!.path]).toBe(true);
    expect(expansionAfter[newCityNode!.path]).toBe(true);
    expect(expansionAfter[newCountryNode!.path]).toBe(true);
  });

  it('should keep a deep below-frontier chain expanded after the first mapping on its leaf', () => {
    const targetDoc = createWideDeepTargetDoc();
    const mappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    const targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode);
    const documentId = targetDocNode.id;

    const ensureExpanded = (path: string) => {
      if (!useDocumentTreeStore.getState().isExpanded(documentId, path)) {
        TreeUIService.toggleNode(documentId, path);
      }
    };

    const root = tree1.contentRoots[0];
    const deepChain = root.children.find((c) => c.nodeData.title === 'deep_chain');
    expect(deepChain).toBeDefined();
    ensureExpanded(deepChain!.path);
    if (!deepChain!.isParsed) TreeParsingService.parseTreeNode(deepChain!);
    const l2 = deepChain!.children.find((c) => c.nodeData.title === 'L2');
    expect(l2).toBeDefined();
    ensureExpanded(l2!.path);
    if (!l2!.isParsed) TreeParsingService.parseTreeNode(l2!);
    const l3 = l2!.children.find((c) => c.nodeData.title === 'L3');
    expect(l3).toBeDefined();
    ensureExpanded(l3!.path);
    if (!l3!.isParsed) TreeParsingService.parseTreeNode(l3!);
    const l4 = l3!.children.find((c) => c.nodeData.title === 'L4');
    expect(l4).toBeDefined();
    ensureExpanded(l4!.path);

    expect(useDocumentTreeStore.getState().isExpanded(documentId, deepChain!.path)).toBe(true);
    expect(useDocumentTreeStore.getState().isExpanded(documentId, l2!.path)).toBe(true);
    expect(useDocumentTreeStore.getState().isExpanded(documentId, l3!.path)).toBe(true);

    MappingActionService.getOrCreateFieldItem(l4!.nodeData as TargetFieldNodeData);

    const newMappingTree = new MappingTree(
      targetDoc.documentType,
      targetDoc.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    newMappingTree.children = mappingTree.children.map((child) => {
      child.parent = newMappingTree;
      return child;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc, newMappingTree));

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];

    const findByTitle = (title: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let found: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (n: any) => {
        if (n.nodeData.title === title) found = n;
        n.children.forEach(walk);
      };
      for (const r of tree2.contentRoots) walk(r);
      return found;
    };
    const newDeepChain = findByTitle('deep_chain');
    const newL2 = findByTitle('L2');
    const newL3 = findByTitle('L3');
    expect(newDeepChain).toBeDefined();
    expect(newL2).toBeDefined();
    expect(newL3).toBeDefined();

    expect(expansionAfter[newDeepChain!.path]).toBe(true);
    expect(expansionAfter[newL2!.path]).toBe(true);
    expect(expansionAfter[newL3!.path]).toBe(true);

    const visiblePaths = new Set(tree2.flatten(expansionAfter).map((f) => f.path));
    expect(visiblePaths.has(newL2!.path)).toBe(true);
    expect(visiblePaths.has(newL3!.path)).toBe(true);
  });

  it('should preserve descendant expansion across mapping create and remove on substituted wrapper member', () => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'target-sub-doc',
      { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
      { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
    );
    const { document: targetDoc } = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(targetDoc).toBeDefined();

    const mappingTree = new MappingTree(
      targetDoc!.documentType,
      targetDoc!.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    mappingTree.namespaceMap = { sub: 'http://www.example.com/SUBSTITUTION' };

    const zooRootField = targetDoc!.fields[0];
    const abstractAnimalField = zooRootField.fields.find((f) => f.name === 'AbstractAnimal');
    expect(abstractAnimalField).toBeDefined();
    FieldOverrideService.applyFieldSubstitution(abstractAnimalField!, 'sub:Cat', mappingTree.namespaceMap);

    const targetDocNode1 = new TargetDocumentNodeData(targetDoc!, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode1);
    const documentId = targetDocNode1.id;
    const store = useDocumentTreeStore.getState();

    const zooRootNode = tree1.contentRoots[0];
    if (!zooRootNode.isParsed) TreeParsingService.parseTreeNode(zooRootNode);
    const catNode = zooRootNode.children.find((c) => c.nodeData.title === 'Cat');
    expect(catNode).toBeDefined();
    if (!catNode!.isParsed) TreeParsingService.parseTreeNode(catNode!);

    const catPath1 = catNode!.path;
    if (store.isExpanded(documentId, catPath1)) {
      TreeUIService.toggleNode(documentId, catPath1);
    }
    expect(store.isExpanded(documentId, catPath1)).toBe(false);

    const catField = (catNode!.nodeData as TargetFieldNodeData).field;
    MappingService.createFieldItem(mappingTree, zooRootField);
    const zooFieldItem = mappingTree.children[0];
    MappingService.createFieldItem(zooFieldItem, catField);

    const newMappingTree1 = new MappingTree(
      targetDoc!.documentType,
      targetDoc!.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    newMappingTree1.namespaceMap = mappingTree.namespaceMap;
    newMappingTree1.children = mappingTree.children.map((c) => {
      c.parent = newMappingTree1;
      return c;
    });

    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc!, newMappingTree1));

    const zooRootNode2 = tree2.contentRoots[0];
    if (!zooRootNode2.isParsed) TreeParsingService.parseTreeNode(zooRootNode2);
    const mappedCatNode = zooRootNode2.children.find((c) => c.nodeData.title === 'Cat');
    expect(mappedCatNode).toBeDefined();
    expect(mappedCatNode!.path).not.toBe(catPath1);
    const expansionAfterCreate = useDocumentTreeStore.getState().expansionState[documentId];
    expect(expansionAfterCreate[mappedCatNode!.path]).toBe(false);
    expect(
      Object.keys(expansionAfterCreate).filter((k) => k === catPath1 || k.startsWith(catPath1 + '/')),
    ).toHaveLength(0);

    const emptyMappingTree = new MappingTree(
      targetDoc!.documentType,
      targetDoc!.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    emptyMappingTree.namespaceMap = mappingTree.namespaceMap;

    const tree3 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc!, emptyMappingTree));

    const zooRootNode3 = tree3.contentRoots[0];
    if (!zooRootNode3.isParsed) TreeParsingService.parseTreeNode(zooRootNode3);
    const revertedCatNode = zooRootNode3.children.find((c) => c.nodeData.title === 'Cat');
    expect(revertedCatNode).toBeDefined();
    expect(revertedCatNode!.path).toBe(catPath1);
    const expansionAfterRemove = useDocumentTreeStore.getState().expansionState[documentId];
    expect(expansionAfterRemove[revertedCatNode!.path]).toBe(false);
    expect(
      Object.keys(expansionAfterRemove).filter(
        (k) => k === mappedCatNode!.path || k.startsWith(mappedCatNode!.path + '/'),
      ),
    ).toHaveLength(0);
  });

  it('should resolve a path collision instead of throwing (reported revert crash)', () => {
    // Regression for the reported crash "applyPathMigration: collision on key ...".
    // On revert, the store can hold BOTH the wrapper-segment key and the mapped-prefix key for
    // the same logical node; the remove path map collapses them onto one path. The migration must
    // resolve this deterministically (migrated value wins), not throw. Reconstructed verbatim from
    // the crash the user hit.
    const expansion = {
      'targetBody:Body://fx-Zoo-4246/fx-AbstractAnimal-2221/fx-Cat-2941/fx-name-1451': true,
      'targetBody:Body://fx-Zoo-4246-2671/fx-Cat-2941-1284/fx-name-1451': false,
    };
    const pathMap = new Map<string, string>([
      [
        'targetBody:Body://fx-Zoo-4246-2671/fx-Cat-2941-1284',
        'targetBody:Body://fx-Zoo-4246/fx-AbstractAnimal-2221/fx-Cat-2941',
      ],
    ]);
    const collidedKey = 'targetBody:Body://fx-Zoo-4246/fx-AbstractAnimal-2221/fx-Cat-2941/fx-name-1451';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apply = () => (TreeUIService as any).applyPathMigration(expansion, pathMap) as Record<string, boolean>;
    expect(apply).not.toThrow();
    const result = apply();
    // The migrated entry (value=false) wins at the collided key; only one key remains.
    expect(result[collidedKey]).toBe(false);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('should migrate expansion when a NON-collection wrapper member is selected (wrapper→member, maxOccurs=1)', () => {
    // Regression: selecting sub:Car on Equipment/Primary/AbstractVehicle (maxOccurs=1) transitions
    // the visible node from the wrapper (path segment = AbstractVehicle.id) to the member
    // (segment = Car.id / mapping.id). The pre-selection expansion key lived under the wrapper id,
    // so it must migrate to the new member path — and the stale wrapper key must NOT survive.
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'target-wm-doc',
      { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
      { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
    );
    const { document: targetDoc } = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(targetDoc).toBeDefined();

    const mappingTree = new MappingTree(
      targetDoc!.documentType,
      targetDoc!.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    mappingTree.namespaceMap = { sub: 'http://www.example.com/SUBSTITUTION' };

    const targetDocNode1 = new TargetDocumentNodeData(targetDoc!, mappingTree);
    const tree1 = TreeUIService.createTree(targetDocNode1);
    const documentId = targetDocNode1.id;
    const store = useDocumentTreeStore.getState();

    // Navigate Zoo → Equipment → Primary → AbstractVehicle and expand the wrapper.
    const zoo = tree1.contentRoots[0];
    if (!zoo.isParsed) TreeParsingService.parseTreeNode(zoo);
    const equipment = zoo.children.find((c) => c.nodeData.title === 'Equipment')!;
    if (!equipment.isParsed) TreeParsingService.parseTreeNode(equipment);
    const primary = equipment.children.find((c) => c.nodeData.title === 'Primary')!;
    if (!primary.isParsed) TreeParsingService.parseTreeNode(primary);
    const vehicle = primary.children.find((c) => /Vehicle/i.test(c.nodeData.title))!;
    expect(vehicle).toBeDefined();
    if (!store.isExpanded(documentId, vehicle.path)) TreeUIService.toggleNode(documentId, vehicle.path);
    const wrapperPathBefore = vehicle.path;
    expect(useDocumentTreeStore.getState().isExpanded(documentId, wrapperPathBefore)).toBe(true);

    // Select Car through the real UI entry point (creates the FieldItem chain).
    const wrapperField = (vehicle.nodeData as TargetFieldNodeData).field;
    AbstractFieldService.applyAbstractSubstitution(
      vehicle.nodeData,
      wrapperField,
      'sub:Car',
      {},
      wrapperField,
      mappingTree.namespaceMap,
      true,
    );

    // Structural rebuild.
    const mappingTree2 = new MappingTree(
      targetDoc!.documentType,
      targetDoc!.documentId,
      DocumentDefinitionType.XML_SCHEMA,
    );
    mappingTree2.namespaceMap = mappingTree.namespaceMap;
    mappingTree2.children = mappingTree.children.map((c) => {
      c.parent = mappingTree2;
      return c;
    });
    const tree2 = TreeUIService.createTree(new TargetDocumentNodeData(targetDoc!, mappingTree2));

    const zoo2 = tree2.contentRoots[0];
    if (!zoo2.isParsed) TreeParsingService.parseTreeNode(zoo2);
    const equipment2 = zoo2.children.find((c) => c.nodeData.title === 'Equipment')!;
    if (!equipment2.isParsed) TreeParsingService.parseTreeNode(equipment2);
    const primary2 = equipment2.children.find((c) => c.nodeData.title === 'Primary')!;
    if (!primary2.isParsed) TreeParsingService.parseTreeNode(primary2);
    const carNode = primary2.children.find((c) => c.nodeData.title === 'Car')!;
    expect(carNode).toBeDefined();
    expect(carNode.path).not.toBe(wrapperPathBefore);

    const expansionAfter = useDocumentTreeStore.getState().expansionState[documentId];
    // The member node keeps the wrapper's expanded state (true) under its new path.
    expect(expansionAfter[carNode.path]).toBe(true);
    // No stale key under the old wrapper path prefix.
    expect(
      Object.keys(expansionAfter).filter((k) => k === wrapperPathBefore || k.startsWith(wrapperPathBefore + '/')),
    ).toHaveLength(0);
    // And no stale AbstractVehicle key survives under the migrated Primary prefix.
    expect(Object.keys(expansionAfter).some((k) => k.endsWith('/' + wrapperField.id))).toBe(false);
  });
});
