import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import { CopyOfSelector, FieldItem, MappingTree, OtherwiseItem, WhenItem } from '../../models/datamapper/mapping';
import { getCopyOfSequenceOrderXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { CopyOfPlacementService } from './copy-of-placement.service';

describe('CopyOfPlacementService.isLeadingCopyOf', () => {
  it('should lead for an empty container-node copy-of', () => {
    const copyOf = new CopyOfSelector({} as never);
    expect(CopyOfPlacementService.isLeadingCopyOf(copyOf)).toBe(true);
  });

  it('should not lead for an xsl:otherwise holding only an empty copy-of', () => {
    const otherwise = new OtherwiseItem({} as never);
    otherwise.children.push(new CopyOfSelector(otherwise));
    expect(CopyOfPlacementService.isLeadingCopyOf(otherwise)).toBe(false);
  });

  it('should not lead for an xsl:when holding only an empty copy-of', () => {
    const when = new WhenItem({} as never);
    when.children.push(new CopyOfSelector(when));
    expect(CopyOfPlacementService.isLeadingCopyOf(when)).toBe(false);
  });
});

describe('CopyOfPlacementService with the CopyOfSequenceOrder schema', () => {
  const NS = 'io.kaoto.datamapper.poc.test';

  const newRoot = () => {
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'CopyOfSequenceOrder.xsd': getCopyOfSequenceOrderXsd(),
      }),
    ).document!;
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: NS };
    tree.targetDocument = doc;
    return { doc, tree, root: new FieldItem(tree, doc.fields[0]) };
  };

  describe('selectsElementOf()', () => {
    it('should be true only for a copy-of that selects the field item it sits in', () => {
      const { root } = newRoot();
      const shipTo = new FieldItem(root, root.field.fields.find((f) => f.name === 'ShipTo')!);
      root.children.push(shipTo);
      const own = new CopyOfSelector(shipTo);
      own.expression = '/ns0:Order/ShipTo';
      const other = new CopyOfSelector(shipTo);
      other.expression = '/ns0:Order/ShipTo/Name';

      expect(CopyOfPlacementService.selectsElementOf(own, shipTo)).toBe(true);
      expect(CopyOfPlacementService.selectsElementOf(other, shipTo)).toBe(false);
    });
  });

  describe('getAnchorFields()', () => {
    it.each([
      ['a single path', '/ns0:Order/ShipTo', ['ShipTo']],
      ['a comma list in written order', '/ns0:Order/TotalAmount, /ns0:Order/ShipTo', ['TotalAmount', 'ShipTo']],
      ['a union', '/ns0:Order/ShipTo | /ns0:Order/Item', ['ShipTo', 'Item']],
      ['a parenthesized union', '(/ns0:Order/ShipTo | /ns0:Order/Item)', ['ShipTo', 'Item']],
      ['paths that do not resolve are skipped', '/ns0:Order/ShipTo, /ns0:Order/Unknown, /ns0:Order/*', ['ShipTo']],
      ['a wildcard alone', '/ns0:Order/*', []],
      ['an empty select', '', []],
      ['an unparsable select', '/ns0:Order/(', []],
    ])('should return the child fields named by %s', (_name, select, expected) => {
      const { root } = newRoot();
      const copyOf = new CopyOfSelector(root);
      copyOf.expression = select;

      expect(CopyOfPlacementService.getAnchorFields(copyOf).map((f) => f.name)).toEqual(expected);
    });

    it('should be empty when the copy-of has no enclosing field', () => {
      const copyOf = new CopyOfSelector(
        new MappingTree(DocumentType.TARGET_BODY, 'x', DocumentDefinitionType.Primitive),
      );
      copyOf.expression = '/ns0:Order/ShipTo';

      expect(CopyOfPlacementService.getAnchorFields(copyOf)).toEqual([]);
    });
  });
});
