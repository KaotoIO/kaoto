import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingTree,
  ValueOfSelector,
} from '../../models/datamapper/mapping';
import { MappingNodeData, TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { getCopyOfSequenceOrderXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
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

  const addCopyOf = (expression: string, valueType = CopyOfType.CONTAINER_NODE) => {
    const copyOf = new CopyOfSelector(orderItem, valueType);
    copyOf.expression = expression;
    orderItem.children.push(copyOf);
    return copyOf;
  };

  it('moves a separate copy-of inline onto the child it selects once the path is 1-to-1', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo');

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');

    expect(copyOf.valueType).toBe(CopyOfType.CONTAINER);
    expect(copyOf.parent).toBeInstanceOf(FieldItem);
    expect((copyOf.parent as FieldItem).field.name).toBe('ShipTo');
    expect(orderItem.children).not.toContain(copyOf);
  });

  it('keeps a copy-of separate when its non-repeatable child field already has other content', () => {
    const shipToField = orderItem.field.fields.find((f) => f.name === 'ShipTo')!;
    const existing = new FieldItem(orderItem, shipToField);
    const valueOf = new ValueOfSelector(existing);
    valueOf.expression = '/ns0:Order/Id';
    existing.children.push(valueOf);
    orderItem.children.push(existing);
    const copyOf = addCopyOf('/ns0:Order/ShipTo');

    MappingActionService.commitExpression(docNode, copyOf);

    expect(copyOf.parent).toBe(orderItem);
    expect(copyOf.valueType).toBe(CopyOfType.CONTAINER_NODE);
    expect(orderItem.children.filter((c) => c instanceof FieldItem && c.field === shipToField)).toEqual([existing]);
    expect(existing.children).toEqual([valueOf]);
  });

  it('creates a second field item for a repeatable child field that already has other content', () => {
    const itemField = orderItem.field.fields.find((f) => f.name === 'Item')!;
    const existing = new FieldItem(orderItem, itemField);
    const valueOf = new ValueOfSelector(existing);
    valueOf.expression = '/ns0:Order/Id';
    existing.children.push(valueOf);
    orderItem.children.push(existing);
    const copyOf = addCopyOf('/ns0:Order/Item');

    MappingActionService.commitExpression(docNode, copyOf);

    const host = copyOf.parent as FieldItem;
    expect(host).not.toBe(existing);
    expect(host.field).toBe(itemField);
    expect(existing.children).toEqual([valueOf]);
  });

  it('moves an inline copy-of back to a separate node when the path stops being 1-to-1', () => {
    const copyOf = addCopyOf('/ns0:Order/ShipTo');
    MappingActionService.commitExpression(docNode, copyOf);
    const shipTo = copyOf.parent as FieldItem;

    copyOf.expression = '/ns0:Order/*';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');

    expect(copyOf.valueType).toBe(CopyOfType.CONTAINER_NODE);
    expect(copyOf.parent).toBe(orderItem);
    expect(orderItem.children).toContain(copyOf);
    expect(orderItem.children).not.toContain(shipTo);
  });

  it('rebuilds the tree when a separate copy-of changes between empty and non-empty, so its row moves', () => {
    const copyOf = addCopyOf('');
    const before = VisualizationService.generateNonDocumentNodeDataChildren(
      VisualizationService.generateStructuredDocumentChildren(docNode)[0],
    );
    expect('mapping' in before[0] ? before[0].mapping : undefined).toBe(copyOf);

    copyOf.expression = '/ns0:Order/*';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
    expect(copyOf.parent).toBe(orderItem);
    expect(copyOf.valueType).toBe(CopyOfType.CONTAINER_NODE);

    const after = VisualizationService.generateNonDocumentNodeDataChildren(
      VisualizationService.generateStructuredDocumentChildren(docNode)[0],
    );
    const mappings = after.map((n) => ('mapping' in n ? n.mapping : undefined));
    expect(mappings[mappings.length - 1]).toBe(copyOf);
  });

  it('rebuilds on the first commit of a separate copy-of, then only when its leading state changes', () => {
    const copyOf = addCopyOf('/ns0:Order/*');

    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
    copyOf.expression = '/ns0:Order/node()';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('none');
    copyOf.expression = '';
    expect(MappingActionService.commitExpression(docNode, copyOf)).toBe('structural-update');
    copyOf.expression = '/ns0:Order/*';
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
    const copyOf = addCopyOf('/ns0:Order/ShipTo');
    MappingActionService.commitExpression(docNode, copyOf);
    const shipTo = copyOf.parent as FieldItem;

    const children = VisualizationService.generateNonDocumentNodeDataChildren(
      VisualizationService.generateStructuredDocumentChildren(docNode)[0],
    );
    const names = children.map((n) => ('field' in n ? (n.field as { name: string }).name : undefined));
    expect(names.indexOf('Id')).toBeLessThan(names.indexOf('ShipTo'));
    expect(names.indexOf('ShipTo')).toBeLessThan(names.indexOf('TotalAmount'));

    const xslt = MappingSerializerService.serialize(tree, new Map());
    expect(xslt.indexOf('select="/ns0:Order/ShipTo"')).toBeGreaterThan(xslt.indexOf('<Id'));
    expect(xslt.indexOf('select="/ns0:Order/ShipTo"')).toBeLessThan(xslt.indexOf('<TotalAmount'));
    expect(shipTo.field.name).toBe('ShipTo');
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
