import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingItemOrderBucket,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueOfSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { XPathOutputKind } from '../../models/datamapper/xpath';
import { getCopyOfSequenceOrderXsd, getXmlStubFile, TestUtil } from '../../stubs/datamapper/data-mapper';
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
      ['both branches of if', 'if (/ns0:Order/Id) then /ns0:Order/ShipTo else /ns0:Order/Item', ['ShipTo', 'Item']],
      ['only the left operand of except', '/ns0:Order/Item except /ns0:Order/ShipTo', ['Item']],
      ['only the left operand of intersect', '/ns0:Order/Item intersect /ns0:Order/ShipTo', ['Item']],
      ['a wildcard except, whose right operand is not in the result', '/ns0:Order/* except /ns0:Order/ShipTo', []],
      ['an if with a quantified branch', 'if (c) then some $x in X satisfies $x else /ns0:Order/ShipTo', ['ShipTo']],
      ['a cast, which writes text rather than the field', '/ns0:Order/ShipTo cast as xs:string', []],
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

    it('should return no anchor for a multi-field expression nested in a loop', () => {
      const { root } = newRoot();
      const forEach = new ForEachItem(root);
      root.children.push(forEach);
      const copyOf = new CopyOfSelector(forEach);
      copyOf.expression = '/ns0:Order/ShipTo, /ns0:Order/Item';

      expect(CopyOfPlacementService.getAnchorFields(copyOf)).toEqual([]);
    });
  });

  describe('getInlineField() under a loop', () => {
    it.each([
      ['xsl:for-each', (root: FieldItem) => new ForEachItem(root)],
      ['xsl:for-each-group', (root: FieldItem) => new ForEachGroupItem(root)],
    ])('should not inline a named 1-to-1 path nested under %s', (_name, makeLoop) => {
      const { root } = newRoot();
      const loop = makeLoop(root);
      root.children.push(loop);
      const copyOf = new CopyOfSelector(loop);
      copyOf.expression = '/ns0:Order/ShipTo';

      expect(CopyOfPlacementService.getInlineField(copyOf)).toBeUndefined();
    });

    it('should inline the same named 1-to-1 path when there is no enclosing loop', () => {
      const { root } = newRoot();
      const copyOf = new CopyOfSelector(root);
      copyOf.expression = '/ns0:Order/ShipTo';

      expect(CopyOfPlacementService.getInlineField(copyOf)?.name).toBe('ShipTo');
    });
  });

  describe('getInlineField() with an atomic operator', () => {
    it.each([['/ns0:Order/ShipTo cast as xs:string'], ['-/ns0:Order/ShipTo'], ['/ns0:Order/ShipTo to 3']])(
      'should not inline %s, which writes text rather than the field',
      (select) => {
        const { root } = newRoot();
        const copyOf = new CopyOfSelector(root);
        copyOf.expression = select;

        expect(CopyOfPlacementService.getInlineField(copyOf)).toBeUndefined();
      },
    );

    it('should inline a treat as, which returns the field itself', () => {
      const { root } = newRoot();
      const copyOf = new CopyOfSelector(root);
      copyOf.expression = '/ns0:Order/ShipTo treat as element()';

      expect(CopyOfPlacementService.getInlineField(copyOf)?.name).toBe('ShipTo');
    });
  });
});

describe('CopyOfPlacementService.getOutputKind', () => {
  const newShipOrder = () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
    tree.targetDocument = doc;
    const root = new FieldItem(tree, doc.fields[0]);
    tree.children.push(root);
    const field = (name: string) => root.field.fields.find((f) => f.name === name)!;
    return { root, field };
  };

  const addCopyOf = (parent: MappingItem, select: string) => {
    const copyOf = new CopyOfSelector(parent);
    copyOf.expression = select;
    parent.children.push(copyOf);
    return copyOf;
  };

  const addIf = (parent: MappingItem) => {
    const ifItem = new IfItem(parent);
    ifItem.expression = 'true()';
    parent.children.push(ifItem);
    return ifItem;
  };

  const unknownElement = () =>
    new DOMParser().parseFromString(
      '<xsl:element xmlns:xsl="http://www.w3.org/1999/XSL/Transform" name="X"/>',
      'application/xml',
    ).documentElement;

  it('should classify a field item by whether its field is an attribute', () => {
    const { root, field } = newShipOrder();

    expect(CopyOfPlacementService.getOutputKind(new FieldItem(root, field('OrderId')))).toBe(
      XPathOutputKind.ATTRIBUTES,
    );
    expect(CopyOfPlacementService.getOutputKind(new FieldItem(root, field('OrderPerson')))).toBe(
      XPathOutputKind.CHILDREN,
    );
  });

  it('should classify a copy-of by its select', () => {
    const { root } = newShipOrder();

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, '/ns0:ShipOrder/@*'))).toBe(XPathOutputKind.ATTRIBUTES);
    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, '/ns0:ShipOrder/@* | /ns0:ShipOrder/node()'))).toBe(
      XPathOutputKind.ATTRIBUTES_AND_CHILDREN,
    );
    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, '/ns0:ShipOrder/ns0:OrderPerson'))).toBe(
      XPathOutputKind.CHILDREN,
    );
    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, ''))).toBe(XPathOutputKind.EMPTY);
    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, '()'))).toBe(XPathOutputKind.EMPTY);
  });

  it('should not let a copy-of of an empty sequence turn an attributes-only instruction into both', () => {
    const { root, field } = newShipOrder();
    const ifItem = addIf(root);
    ifItem.children.push(new FieldItem(ifItem, field('OrderId')));
    addCopyOf(ifItem, '()');

    expect(CopyOfPlacementService.getOutputKind(ifItem)).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should resolve . through the select of an enclosing for-each', () => {
    const { root } = newShipOrder();
    const forEach = new ForEachItem(root);
    forEach.expression = '/ns0:ShipOrder/@*';
    root.children.push(forEach);

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(forEach, '.'))).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should resolve . through a field the for-each wraps, the shape Wrap with for-each creates', () => {
    const { root, field } = newShipOrder();
    const forEach = new ForEachItem(root);
    forEach.expression = '/ns0:ShipOrder/@*';
    root.children.push(forEach);
    const item = new FieldItem(forEach, field('Item'));
    forEach.children.push(item);

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(item, '.'))).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should resolve . through nested for-each selects', () => {
    const { root } = newShipOrder();
    const outer = new ForEachItem(root);
    outer.expression = '/ns0:ShipOrder/@*';
    root.children.push(outer);
    const inner = new ForEachItem(outer);
    inner.expression = '.';
    outer.children.push(inner);

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(inner, '.'))).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should resolve . through the select of an enclosing for-each-group', () => {
    const { root, field } = newShipOrder();
    const group = new ForEachGroupItem(root);
    group.expression = '/ns0:ShipOrder/@*';
    group.groupingExpression = 'name()';
    root.children.push(group);
    const item = new FieldItem(group, field('Item'));
    group.children.push(item);

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(group, '.'))).toBe(XPathOutputKind.ATTRIBUTES);
    expect(CopyOfPlacementService.getOutputKind(addCopyOf(item, '.'))).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should read current-group() as children, a known gap', () => {
    const { root } = newShipOrder();
    const group = new ForEachGroupItem(root);
    group.expression = '/ns0:ShipOrder/@*';
    root.children.push(group);

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(group, 'current-group()'))).toBe(XPathOutputKind.CHILDREN);
  });

  it('should treat . outside any loop as children', () => {
    const { root } = newShipOrder();

    expect(CopyOfPlacementService.getOutputKind(addCopyOf(root, '.'))).toBe(XPathOutputKind.CHILDREN);
  });

  it('should classify an xsl:if holding only an attribute field as attributes only', () => {
    const { root, field } = newShipOrder();
    const ifItem = addIf(root);
    ifItem.children.push(new FieldItem(ifItem, field('OrderId')));

    expect(CopyOfPlacementService.getOutputKind(ifItem)).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it.each<[string, (parent: IfItem, field: (name: string) => IField) => MappingItem]>([
    ['an element field', (parent, field) => new FieldItem(parent, field('OrderPerson'))],
    ['a value-of', (parent) => new ValueOfSelector(parent)],
    ['an xsl:element the DataMapper does not model', (parent) => new UnknownMappingItem(parent, unknownElement())],
    [
      'a copy-of of an element',
      (parent) => {
        const copyOf = new CopyOfSelector(parent);
        copyOf.expression = '/ns0:ShipOrder/ns0:OrderPerson';
        return copyOf;
      },
    ],
  ])('should classify an xsl:if holding an attribute field and %s as both', (_name, createSibling) => {
    const { root, field } = newShipOrder();
    const ifItem = addIf(root);
    ifItem.children.push(new FieldItem(ifItem, field('OrderId')), createSibling(ifItem, field));

    expect(CopyOfPlacementService.getOutputKind(ifItem)).toBe(XPathOutputKind.ATTRIBUTES_AND_CHILDREN);
  });

  it('should not let a variable turn an attributes-only instruction into both', () => {
    const { root, field } = newShipOrder();
    const ifItem = addIf(root);
    const variable = new VariableItem(ifItem, 'v');
    variable.expression = "'x'";
    ifItem.children.push(variable, new FieldItem(ifItem, field('OrderId')));

    expect(CopyOfPlacementService.getOutputKind(ifItem)).toBe(XPathOutputKind.ATTRIBUTES);
  });

  it('should classify an xsl:if holding only a copy-of of attributes and children as both', () => {
    const { root } = newShipOrder();
    const ifItem = addIf(root);
    addCopyOf(ifItem, '/ns0:ShipOrder/@* | /ns0:ShipOrder/node()');

    expect(CopyOfPlacementService.getOutputKind(ifItem)).toBe(XPathOutputKind.ATTRIBUTES_AND_CHILDREN);
  });

  it('should combine every branch of an xsl:choose', () => {
    const { root, field } = newShipOrder();
    const choose = new ChooseItem(root);
    root.children.push(choose);
    const when = new WhenItem(choose);
    when.expression = 'true()';
    when.children.push(new FieldItem(when, field('OrderId')));
    const otherwise = new OtherwiseItem(choose);
    otherwise.children.push(new FieldItem(otherwise, field('OrderPerson')));
    choose.children.push(when, otherwise);

    expect(CopyOfPlacementService.getOutputKind(choose)).toBe(XPathOutputKind.ATTRIBUTES_AND_CHILDREN);
  });

  it('should classify a copy-of whose select has a quantified if branch as both', () => {
    const { root } = newShipOrder();

    expect(
      CopyOfPlacementService.getOutputKind(
        addCopyOf(root, 'if (c) then some $x in X satisfies $x else /ns0:ShipOrder/@OrderId'),
      ),
    ).toBe(XPathOutputKind.ATTRIBUTES_AND_CHILDREN);
  });
});

describe('CopyOfPlacementService.getAttributeOutputBucket', () => {
  const ALL_ATTRIBUTES = '/ns0:ShipOrder/@*';

  const newShipOrder = () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
    tree.targetDocument = doc;
    const root = new FieldItem(tree, doc.fields[0]);
    tree.children.push(root);
    return root;
  };

  const addField = (parent: MappingItem, name: string) => {
    const shipOrder = parent instanceof FieldItem ? parent.field : (parent.parent as FieldItem).field;
    const field = shipOrder.fields.find((f) => f.name === name);
    if (!field) throw new Error(`field "${name}" not found`);
    const fieldItem = new FieldItem(parent, field);
    parent.children.push(fieldItem);
    return fieldItem;
  };

  const addCopyOf = (parent: MappingItem, select: string) => {
    const copyOf = new CopyOfSelector(parent);
    copyOf.expression = select;
    parent.children.push(copyOf);
    return copyOf;
  };

  const addIf = (parent: MappingItem, ...fill: Array<(ifItem: IfItem) => void>) => {
    const ifItem = new IfItem(parent);
    ifItem.expression = 'true()';
    parent.children.push(ifItem);
    for (const add of fill) add(ifItem);
    return ifItem;
  };

  it.each<[string, (root: FieldItem) => MappingItem, MappingItemOrderBucket | undefined]>([
    ['an attribute field item', (root) => addField(root, 'OrderId'), MappingItemOrderBucket.ATTRIBUTE],
    ['an element field item', (root) => addField(root, 'OrderPerson'), undefined],
    ['a copy-of of every attribute', (root) => addCopyOf(root, ALL_ATTRIBUTES), MappingItemOrderBucket.ATTRIBUTE],
    [
      'a copy-of of one attribute',
      (root) => addCopyOf(root, '/ns0:ShipOrder/@OrderId'),
      MappingItemOrderBucket.ATTRIBUTE,
    ],
    [
      'a copy-of of attributes and nodes',
      (root) => addCopyOf(root, '/ns0:ShipOrder/@* | /ns0:ShipOrder/node()'),
      MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN,
    ],
    [
      'an xsl:if with an attribute field and an attribute copy',
      (root) =>
        addIf(
          root,
          (ifItem) => addField(ifItem, 'OrderId'),
          (ifItem) => addCopyOf(ifItem, ALL_ATTRIBUTES),
        ),
      MappingItemOrderBucket.ATTRIBUTE,
    ],
    [
      'an xsl:if with an attribute copy only',
      (root) => addIf(root, (ifItem) => addCopyOf(ifItem, ALL_ATTRIBUTES)),
      MappingItemOrderBucket.ATTRIBUTE,
    ],
    [
      'an xsl:if with an attribute field and an element field',
      (root) =>
        addIf(
          root,
          (ifItem) => addField(ifItem, 'OrderId'),
          (ifItem) => addField(ifItem, 'OrderPerson'),
        ),
      MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN,
    ],
    [
      'a field-less for-each over the attributes',
      (root) => {
        const forEach = new ForEachItem(root);
        forEach.expression = ALL_ATTRIBUTES;
        root.children.push(forEach);
        addCopyOf(forEach, '.');
        return forEach;
      },
      MappingItemOrderBucket.ATTRIBUTE,
    ],
    [
      'a variable',
      (root) => {
        const variable = new VariableItem(root, 'v');
        root.children.push(variable);
        return variable;
      },
      undefined,
    ],
    ['a blank copy-of', (root) => addCopyOf(root, ''), undefined],
    ['a copy-of of the empty sequence', (root) => addCopyOf(root, '()'), undefined],
  ])('should classify %s', (_name, create, expected) => {
    const item = create(newShipOrder());

    expect(CopyOfPlacementService.getAttributeOutputBucket(item)).toBe(expected);
  });
});

describe('CopyOfPlacementService with the UnderscoreNames schema', () => {
  const newRoot = () => {
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'UnderscoreNames.xsd': getXmlStubFile('UnderscoreNames.xsd'),
      }),
    ).document!;
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    tree.targetDocument = doc;
    return new FieldItem(tree, doc.fields[0]);
  };

  it('should place a copy-of of an element starting with _ on that element, not on the one without _', () => {
    const root = newRoot();
    const underscoreItem = new FieldItem(root, root.field.fields.find((f) => f.name === '_item')!);
    const item = new FieldItem(root, root.field.fields.find((f) => f.name === 'item')!);
    root.children.push(underscoreItem, item);
    const copyOf = new CopyOfSelector(underscoreItem);
    copyOf.expression = '/Root/_item';

    expect(CopyOfPlacementService.selectsElementOf(copyOf, underscoreItem)).toBe(true);
    expect(CopyOfPlacementService.selectsElementOf(copyOf, item)).toBe(false);
    const rootCopyOf = new CopyOfSelector(root);
    rootCopyOf.expression = '/Root/_item';
    expect(CopyOfPlacementService.getAnchorFields(rootCopyOf).map((f) => f.name)).toEqual(['_item']);
    expect(CopyOfPlacementService.getInlineField(rootCopyOf)).toBe(underscoreItem.field);
  });
});
