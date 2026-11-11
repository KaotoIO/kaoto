import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
} from '../../models/datamapper/mapping';
import {
  CopyOfFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { getCopyOfSequenceOrderXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { CopyOfPlacementService } from '../mapping/copy-of-placement.service';
import { MappingService } from '../mapping/mapping.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { MappingLinksService } from './mapping-links.service';
import { TargetRenderService } from './target-render.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService — copy-of placement', () => {
  const NS = 'io.kaoto.datamapper.poc.test';
  let tree: MappingTree;
  let orderItem: FieldItem;
  let docNode: TargetDocumentNodeData;

  beforeEach(() => {
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'CopyOfSequenceOrder.xsd': getCopyOfSequenceOrderXsd() },
    );
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
    tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    orderItem = new FieldItem(tree, doc.fields[0]);
    tree.children.push(orderItem);
    docNode = new TargetDocumentNodeData(doc, tree);
  });

  const addCopyOf = (expression: string) => {
    const copyOf = new CopyOfSelector(orderItem);
    copyOf.expression = expression;
    orderItem.children.push(copyOf);
    return copyOf;
  };

  /** Snapshots the tree as the canvas would, so a later edit is judged against what is on screen. */
  const snapshot = () => {
    docNode = new TargetDocumentNodeData(
      docNode.document,
      tree,
      TargetRenderService.buildIndex(tree, { sourceParameterMap: new Map(), sourceBody: undefined as never }),
    );
  };

  const orderChildren = () =>
    VisualizationService.generateNonDocumentNodeDataChildren(
      VisualizationService.generateStructuredDocumentChildren(docNode)[0],
    );

  it('never rewrites the model: a copy-of stays a standalone child of its parent whatever it selects', () => {
    const copyOf = addCopyOf('/ns0:Order/*');
    snapshot();

    for (const expression of ['/ns0:Order/ShipTo', '/ns0:Order/*', '']) {
      copyOf.expression = expression;
      MappingActionService.commitExpression(docNode, copyOf);
      expect(copyOf.parent).toBe(orderItem);
      expect(orderItem.children).toEqual([copyOf]);
    }
  });

  it('draws a copy-of on the row of the child it selects once the path is 1-to-1', () => {
    const copyOf = addCopyOf('/ns0:Order/*');
    snapshot();

    copyOf.expression = '/ns0:Order/ShipTo';

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
    const row = orderChildren().find((n) => n instanceof CopyOfFieldNodeData) as CopyOfFieldNodeData;
    expect(row.mapping).toBe(copyOf);
    expect(row.field.name).toBe('ShipTo');
  });

  it('draws a copy-of that stops being 1-to-1 as a node of its own', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo');
    snapshot();

    copyOf.expression = '/ns0:Order/*';

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
    expect(orderChildren().some((n) => n instanceof CopyOfFieldNodeData)).toBe(false);
  });

  it('draws a copy-of of two fields as a node of its own instead of on either field row', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo, /ns0:Order/Id');

    expect(CopyOfPlacementService.getInlineField(copyOf)).toBeUndefined();
    expect(orderChildren().some((n) => n instanceof CopyOfFieldNodeData)).toBe(false);
  });

  it('keeps the tree when an edit leaves the copy-of on the same row', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo');
    snapshot();

    copyOf.expression = '/ns0:Order/ShipTo ';

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('none');
  });

  it('moves a copy-of from one field row to another when the selected child changes', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo');
    snapshot();

    copyOf.expression = '/ns0:Order/Id';

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
  });

  it('rebuilds the tree when a separate copy-of changes between empty and non-empty, so its row moves', () => {
    const copyOf = addCopyOf('');
    snapshot();
    expect('mapping' in orderChildren()[0] ? (orderChildren()[0] as MappingNodeData).mapping : undefined).toBe(copyOf);

    copyOf.expression = '/ns0:Order/*';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');

    const mappings = orderChildren().map((n) => ('mapping' in n ? n.mapping : undefined));
    expect(mappings[mappings.length - 1]).toBe(copyOf);
  });

  it('rebuilds only when the leading state of a separate copy-of changes', () => {
    const copyOf = addCopyOf('/ns0:Order/*');
    snapshot();

    copyOf.expression = '/ns0:Order/node()';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('none');
    copyOf.expression = '';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
  });

  it('renders only an empty copy-of ahead of the fields', () => {
    const empty = addCopyOf('');
    const wildcard = addCopyOf('/ns0:Order/*');

    const children = VisualizationService.generateNonDocumentNodeDataChildren(
      VisualizationService.generateStructuredDocumentChildren(docNode)[0],
    );
    const mappings = children.map((n) => ('mapping' in n ? n.mapping : undefined));

    expect(mappings[0]).toBe(empty);
    expect(mappings.indexOf(wildcard)).toBe(children.length - 1);
  });
  it('renders an inline 1-to-1 copy-of at its child position, matching the serialized XSLT order', () => {
    const doc = tree.children[0] as FieldItem;
    const idItem = new FieldItem(doc, doc.field.fields.find((f) => f.name === 'Id')!);
    const totalItem = new FieldItem(doc, doc.field.fields.find((f) => f.name === 'TotalAmount')!);
    doc.children.push(totalItem, idItem);
    addCopyOf('/ns0:Order/ShipTo');

    const names = orderChildren().map((n) => ('field' in n ? (n.field as { name: string }).name : undefined));
    expect(names.indexOf('Id')).toBeLessThan(names.indexOf('ShipTo'));
    expect(names.indexOf('ShipTo')).toBeLessThan(names.indexOf('TotalAmount'));

    const xslt = MappingSerializerService.serialize(tree, new Map());
    expect(xslt.indexOf('select="/ns0:Order/ShipTo"')).toBeGreaterThan(xslt.indexOf('<Id'));
    expect(xslt.indexOf('select="/ns0:Order/ShipTo"')).toBeLessThan(xslt.indexOf('<TotalAmount'));
  });

  it('renders a multi-field copy-of at the position its XSLT is emitted', () => {
    const doc = tree.children[0] as FieldItem;
    doc.children.push(
      new FieldItem(doc, doc.field.fields.find((f) => f.name === 'TotalAmount')!),
      new FieldItem(doc, doc.field.fields.find((f) => f.name === 'Id')!),
    );
    const copyOf = addCopyOf('/ns0:Order/TotalAmount, /ns0:Order/ShipTo');
    expect(CopyOfPlacementService.getInlineField(copyOf)).toBeUndefined();

    const labels = orderChildren().map((n) => {
      if (n instanceof MappingNodeData && n.mapping === copyOf) return 'copy';
      return 'field' in n ? (n.field as { name: string }).name : undefined;
    });
    // ShipTo is the earliest field it names, so the copy-of sits right before the ShipTo row.
    expect(labels.indexOf('Id')).toBeLessThan(labels.indexOf('copy'));
    expect(labels.indexOf('copy')).toBeLessThan(labels.indexOf('ShipTo'));
    expect(labels.indexOf('copy')).toBeLessThan(labels.indexOf('TotalAmount'));

    const xslt = MappingSerializerService.serialize(tree, new Map());
    expect(xslt.indexOf('<Id')).toBeLessThan(xslt.indexOf('ns0:Order/TotalAmount, '));
    expect(xslt.indexOf('ns0:Order/TotalAmount, ')).toBeLessThan(xslt.indexOf('<TotalAmount'));
  });

  it.each([
    [
      'for-each',
      '<xsl:for-each select="/ns0:Order/Item"><xsl:copy-of select="."/></xsl:for-each>',
      '<xsl:for-each',
      ForEachItem,
    ],
    ['if', '<xsl:if test="/ns0:Order/Id"><xsl:copy-of select="/ns0:Order/ShipTo"/></xsl:if>', '<xsl:if', IfItem],
    [
      'choose/when',
      '<xsl:choose><xsl:when test="/ns0:Order/Id"><xsl:copy-of select="/ns0:Order/ShipTo"/></xsl:when></xsl:choose>',
      '<xsl:choose',
      ChooseItem,
    ],
  ])(
    'renders a %s wrapping a 1-to-1 copy-of at the position its XSLT is emitted',
    (_label, wrapped, serializedTag, itemClass) => {
      const xsl = 'http://www.w3.org/1999/XSL/Transform';
      const valueOf = (name: string) => `<${name} xmlns=""><xsl:value-of select="/ns0:Order/${name}"/></${name}>`;
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="${xsl}" version="3.0" xmlns:ns0="${NS}"><xsl:template match="/"><Order xmlns="${NS}">${valueOf('Id')}${valueOf('TotalAmount')}${wrapped}</Order></xsl:template></xsl:stylesheet>`;
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'CopyOfSequenceOrder.xsd': getCopyOfSequenceOrderXsd() },
      );
      const doc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      const loaded = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      MappingSerializerService.deserialize(xslt, doc, loaded, new Map());
      const loadedDocNode = new TargetDocumentNodeData(doc, loaded);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(
        VisualizationService.generateStructuredDocumentChildren(loadedDocNode)[0],
      );
      const labels = children.map((n) => {
        if (n instanceof MappingNodeData && n.mapping instanceof itemClass) return 'wrapper';
        return 'field' in n ? (n.field as { name: string }).name : undefined;
      });
      expect(labels).toContain('wrapper');
      expect(labels.indexOf('Id')).toBeLessThan(labels.indexOf('wrapper'));
      expect(labels.indexOf('wrapper')).toBeLessThan(labels.indexOf('TotalAmount'));

      const out = MappingSerializerService.serialize(loaded, new Map());
      expect(out.indexOf('<Id')).toBeLessThan(out.indexOf(serializedTag));
      expect(out.indexOf(serializedTag)).toBeLessThan(out.indexOf('<TotalAmount'));
    },
  );
});

describe('MappingActionService — copy-of review regressions', () => {
  const NS = 'io.kaoto.datamapper.poc.test';

  const createDoc = (type: DocumentType) =>
    XmlSchemaDocumentService.createXmlSchemaDocument(
      new DocumentDefinition(type, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'CopyOfSequenceOrder.xsd': getCopyOfSequenceOrderXsd(),
      }),
    ).document!;

  it('reports a structural change when a container drop replaces the empty field item of the row', () => {
    const sourceDoc = createDoc(DocumentType.SOURCE_BODY);
    const targetDoc = createDoc(DocumentType.TARGET_BODY);
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    const root = new FieldItem(tree, targetDoc.fields[0]);
    tree.children.push(root);
    const emptyShipTo = MappingService.createFieldItem(
      root,
      targetDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!,
    );

    const targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    const rootNode = VisualizationService.generateStructuredDocumentChildren(targetDocNode)[0];
    const shipToRow = VisualizationService.generateNonDocumentNodeDataChildren(rootNode).find(
      (n) => n instanceof FieldItemNodeData && n.mapping === emptyShipTo,
    ) as FieldItemNodeData;
    const sourceRoot = VisualizationService.generateStructuredDocumentChildren(
      new DocumentNodeData(sourceDoc),
    )[0] as FieldNodeData;
    const sourceShipTo = VisualizationService.generateNonDocumentNodeDataChildren(sourceRoot).find(
      (n) => n instanceof FieldNodeData && n.field.name === 'ShipTo',
    ) as FieldNodeData;

    const structural = MappingActionService.engageMapping(tree, sourceShipTo, shipToRow);

    expect(structural).toBe(true);
    expect(root.children).not.toContain(emptyShipTo);
    expect(root.children.some((c) => c instanceof CopyOfSelector)).toBe(true);
  });

  it('draws a guard around an edited copy-of as a regular if instead of throwing on a stale snapshot', () => {
    const targetDoc = createDoc(DocumentType.TARGET_BODY);
    const sourceDoc = createDoc(DocumentType.SOURCE_BODY);
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    const root = new FieldItem(tree, targetDoc.fields[0]);
    tree.children.push(root);
    const guard = new IfItem(root);
    guard.expression = '/ns0:Order/ShipTo';
    root.children.push(guard);
    const copyOf = new CopyOfSelector(guard);
    copyOf.expression = '/ns0:Order/ShipTo';
    guard.children.push(copyOf);
    Object.assign(targetDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!, { minOccurs: 0 });
    Object.assign(sourceDoc.fields[0].fields.find((f) => f.name === 'ShipTo')!, { minOccurs: 0 });
    const renderIndex = TargetRenderService.buildIndex(tree, { sourceParameterMap: new Map(), sourceBody: sourceDoc });
    expect(renderIndex.getAbsorbingField(guard)).toBe(copyOf);

    // The user types a path that no longer selects a single child; the tree is not rebuilt until commit.
    copyOf.expression = '/ns0:Order/*';

    const rootNode = VisualizationService.generateStructuredDocumentChildren(
      new TargetDocumentNodeData(targetDoc, tree, renderIndex),
    )[0];
    expect(() => VisualizationService.generateNonDocumentNodeDataChildren(rootNode)).not.toThrow();
    expect(() => MappingLinksService.extractMappingLinks(tree, new Map(), sourceDoc, renderIndex)).not.toThrow();
  });

  it('keeps the comment of a copy-of row when mapping its child turns it into a field item', () => {
    const doc = createDoc(DocumentType.TARGET_BODY);
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    const root = new FieldItem(tree, doc.fields[0]);
    tree.children.push(root);
    const copyOf = new CopyOfSelector(root);
    copyOf.expression = '/ns0:Order/ShipTo';
    copyOf.comment = 'keep me';
    root.children.push(copyOf);
    const rootNode = VisualizationService.generateStructuredDocumentChildren(new TargetDocumentNodeData(doc, tree))[0];
    const row = VisualizationService.generateNonDocumentNodeDataChildren(rootNode).find(
      (n) => n instanceof CopyOfFieldNodeData,
    ) as CopyOfFieldNodeData;
    const nameRow = VisualizationService.generateNonDocumentNodeDataChildren(row)[0] as TargetNodeData;

    const fieldItem = MappingActionService.getOrCreateFieldItem(nameRow);

    const shipTo = root.children.find((c) => c instanceof FieldItem) as FieldItem;
    expect(shipTo.comment).toBe('keep me');
    expect(root.children).not.toContain(copyOf);
    expect(fieldItem.parent).toBe(shipTo);
  });
});
