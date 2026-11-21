import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  FieldItem,
  ForEachItem,
  IfItem,
  MappingItemOrderBucket,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueOfSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import {
  getAnnotatedFieldsXsd,
  getCopyOfSequenceOrderXsd,
  getShipOrderAttributeCopyOfXslt,
  getShipOrderInstructionOrderXslt,
  getShipOrderLeapfrogOrderXslt,
  getTestDocumentXsd,
  getUnknownApplyTemplateAfterAttributeCopyOfXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document/document-util.service';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingService } from './mapping.service';
import { MappingSerializerService } from './mapping-serializer.service';

function findField(fields: IField[], name: string): IField {
  const field = fields.find((f) => f.name === name);
  if (!field) throw new Error(`field "${name}" not found among [${fields.map((f) => f.name).join(', ')}]`);
  return field;
}

/** Gives a leaf `FieldItem` literal text content, so it serializes as `<Name>text</Name>` rather than self-closing. */
function addLiteralValue(fieldItem: FieldItem, text: string): void {
  const valueOf = new ValueOfSelector(fieldItem);
  valueOf.expression = `'${text}'`;
  valueOf.isLiteral = true;
  fieldItem.children.push(valueOf);
}

/** Like {@link addLiteralValue}, for a complex field with a single nested `url` child (the `Webhook*` shape). */
function addLiteralUrl(fieldItem: FieldItem, text: string): void {
  const urlField = findField(fieldItem.field.fields, 'url');
  const urlItem = new FieldItem(fieldItem, urlField);
  fieldItem.children.push(urlItem);
  addLiteralValue(urlItem, text);
}

/** `ShipOrder` children, in output order, skipping the `xsl:attribute` for `OrderId` when present. */
function shipOrderChildNames(xslt: string): string[] {
  const xsltDocument = new DOMParser().parseFromString(xslt, 'text/xml');
  const xslNsResolver: XPathNSResolver = {
    lookupNamespaceURI(prefix: string | null): string | null {
      return prefix === 'xsl' ? NS_XSL : null;
    },
  };
  const root = xsltDocument.evaluate(
    '/xsl:stylesheet/xsl:template/ShipOrder',
    xsltDocument,
    xslNsResolver,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
  ).singleNodeValue as Element;
  return Array.from(root.childNodes)
    .filter((node): node is Element => node.nodeType === 1)
    .filter((el) => el.localName !== 'attribute')
    .map((el) =>
      el.localName === 'if' || el.localName === 'for-each'
        ? `${el.localName}>${el.children[0]?.localName}`
        : el.localName,
    );
}

describe('MappingSerializerService — sortForSerialization', () => {
  describe('regression guards (already fixed by #4389, not by this change)', () => {
    it('serializes the issue reproducer in schema order', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(
        getShipOrderInstructionOrderXslt(),
        targetDoc,
        tree,
        new Map(),
      ));
      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(shipOrderChildNames(xslt)).toEqual(['if>OrderPerson', 'if>ShipTo', 'Item']);
    });

    it('serializes the six-mapping leapfrog case in schema order, preserving authored order among the tied Item mappings', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(
        getShipOrderLeapfrogOrderXslt(),
        targetDoc,
        tree,
        new Map(),
      ));
      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(shipOrderChildNames(xslt)).toEqual(['if>OrderPerson', 'ShipTo', 'Item', 'Item', 'for-each>Item', 'Item']);
    });

    it('is a fixed point: serialize, deserialize, serialize again is identical for both stubs', () => {
      for (const getXslt of [getShipOrderInstructionOrderXslt, getShipOrderLeapfrogOrderXslt]) {
        const targetDoc = TestUtil.createTargetOrderDoc();
        let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
        ({ mappingTree: tree } = MappingSerializerService.deserialize(getXslt(), targetDoc, tree, new Map()));
        const firstPass = MappingSerializerService.serialize(tree, new Map());

        let roundTripTree = new MappingTree(
          DocumentType.TARGET_BODY,
          BODY_DOCUMENT_ID,
          DocumentDefinitionType.XML_SCHEMA,
        );
        ({ mappingTree: roundTripTree } = MappingSerializerService.deserialize(
          firstPass,
          TestUtil.createTargetOrderDoc(),
          roundTripTree,
          new Map(),
        ));
        const secondPass = MappingSerializerService.serialize(roundTripTree, new Map());
        expect(secondPass).toBe(firstPass);
      }
    });
  });

  describe('choice-wrapper member vs. plain sibling (the bug this plan fixes)', () => {
    it('a choice member sorts after a plain sibling by schema position', () => {
      const targetDoc = TestUtil.createChoiceWithAbstractTargetDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const notification = findField(targetDoc.fields, 'Notification');
      const short = findField(notification.fields, 'Short');
      const choice1 = short.fields[1];
      const webhook = findField(choice1.fields, 'Webhook');

      const notificationItem = new FieldItem(tree, notification);
      tree.children.push(notificationItem);
      const shortItem = new FieldItem(notificationItem, short);
      notificationItem.children.push(shortItem);
      // Authored in reverse of schema order: Webhook before id.
      shortItem.children.push(new FieldItem(shortItem, webhook));
      shortItem.children.push(new FieldItem(shortItem, findField(short.fields, 'id')));

      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(xslt.indexOf('<id')).toBeLessThan(xslt.indexOf('<Webhook'));
    });

    it("an instruction-wrapped choice member sorts after a plain sibling by its wrapped field's schema position", () => {
      // Same as above, but the choice member is wrapped in an xsl:if — this resolves its field via
      // MappingService.getInstructionAnchorFields (InstructionItem branch of getMappingItemFields),
      // a materially different code path than the bare-FieldItem case above.
      const targetDoc = TestUtil.createChoiceWithAbstractTargetDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const notification = findField(targetDoc.fields, 'Notification');
      const short = findField(notification.fields, 'Short');
      const choice1 = short.fields[1];
      const webhook = findField(choice1.fields, 'Webhook');

      const notificationItem = new FieldItem(tree, notification);
      tree.children.push(notificationItem);
      const shortItem = new FieldItem(notificationItem, short);
      notificationItem.children.push(shortItem);
      // Authored in reverse of schema order: the if-wrapped Webhook before id.
      const ifItem = new IfItem(shortItem);
      ifItem.expression = '/ns0:Notification/ns0:Short/ns0:Webhook/ns0:url';
      ifItem.children.push(new FieldItem(ifItem, webhook));
      shortItem.children.push(ifItem);
      shortItem.children.push(new FieldItem(shortItem, findField(short.fields, 'id')));

      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(xslt.indexOf('<id')).toBeLessThan(xslt.indexOf('xsl:if'));
    });

    it('a member of an earlier choice sorts before a member of a later choice, in one coordinate space', () => {
      const targetDoc = TestUtil.createChoiceWithAbstractTargetDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const notification = findField(targetDoc.fields, 'Notification');
      const short = findField(notification.fields, 'Short');
      const choice1 = short.fields[1];
      const choice2 = short.fields[2];
      const webhook = findField(choice1.fields, 'Webhook');
      const webhookMulti = findField(choice2.fields, 'WebhookMulti');

      const notificationItem = new FieldItem(tree, notification);
      tree.children.push(notificationItem);
      const shortItem = new FieldItem(notificationItem, short);
      notificationItem.children.push(shortItem);
      // Authored as WebhookMulti (later choice) then Webhook (earlier choice) — reverse of schema order.
      // Both members are index 1 within their own choice's `fields`, so indexOf in those two unrelated
      // arrays cannot distinguish them; FieldOrderService's root-to-leaf path can.
      const webhookMultiItem = new FieldItem(shortItem, webhookMulti);
      shortItem.children.push(webhookMultiItem);
      addLiteralUrl(webhookMultiItem, 'multi');
      const webhookItem = new FieldItem(shortItem, webhook);
      shortItem.children.push(webhookItem);
      addLiteralUrl(webhookItem, 'single');

      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(xslt.indexOf('<Webhook>')).toBeLessThan(xslt.indexOf('<WebhookMulti>'));
    });
  });

  describe('repeating choice wrapper', () => {
    function buildLargeTree() {
      const targetDoc = TestUtil.createChoiceWithAbstractTargetDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      // Required for CopyOfPlacementService to resolve the "ns0:" prefix used by copy-of expressions
      // below — deserialize() normally populates this from the XSLT's own namespace declarations, but
      // a hand-built tree has no XSLT to read it from.
      tree.namespaceMap = { ns0: 'http://www.example.com/CHOICE_ABSTRACT' };
      const notification = findField(targetDoc.fields, 'Notification');
      const large = findField(notification.fields, 'Large');
      const choice2 = large.fields[2]; // repeating choice (maxOccurs="unbounded")
      const notificationItem = new FieldItem(tree, notification);
      tree.children.push(notificationItem);
      const largeItem = new FieldItem(notificationItem, large);
      notificationItem.children.push(largeItem);
      return { largeItem, choice2 };
    }

    it('two members of a repeating choice, authored in reverse member order, keep authored order', () => {
      const { largeItem, choice2 } = buildLargeTree();
      const pushMulti = findField(choice2.fields, 'PushMulti'); // member index 2
      const webhookMulti = findField(choice2.fields, 'WebhookMulti'); // member index 1
      // Authored in reverse of member order: PushMulti (member 2) before WebhookMulti (member 1).
      // Without truncation this would be reordered to schema order (WebhookMulti first); the
      // repeating-wrapper truncation must keep them tied on the choice's own slot instead.
      const pushMultiItem = new FieldItem(largeItem, pushMulti);
      largeItem.children.push(pushMultiItem);
      addLiteralValue(pushMultiItem, 'push');
      const webhookMultiItem = new FieldItem(largeItem, webhookMulti);
      largeItem.children.push(webhookMultiItem);
      addLiteralValue(webhookMultiItem, 'webhook');

      const xslt = MappingSerializerService.serialize(largeItem.mappingTree, new Map());
      expect(xslt.indexOf('<PushMulti>')).toBeLessThan(xslt.indexOf('<WebhookMulti>'));
    });

    it('sorts the children of a repeating-choice member by schema position while the members keep authored order', () => {
      const targetDoc = TestUtil.createChoiceWithAbstractTargetDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const notification = findField(targetDoc.fields, 'Notification');
      const short = findField(notification.fields, 'Short');
      const choice2 = short.fields[2];
      const webhookMulti = findField(choice2.fields, 'WebhookMulti');
      const email = findField(choice2.fields[0].fields, 'Email');
      DocumentUtilService.resolveTypeFragment(email);

      const notificationItem = new FieldItem(tree, notification);
      tree.children.push(notificationItem);
      const shortItem = new FieldItem(notificationItem, short);
      notificationItem.children.push(shortItem);
      // The repeating choice sits above Email, so it must keep WebhookMulti and Email in authored order
      // without also tying Email's own children, which are written into Email and follow its sequence.
      const webhookMultiItem = new FieldItem(shortItem, webhookMulti);
      shortItem.children.push(webhookMultiItem);
      addLiteralUrl(webhookMultiItem, 'multi');
      const emailItem = new FieldItem(shortItem, email);
      shortItem.children.push(emailItem);
      const subjectItem = new FieldItem(emailItem, findField(email.fields, 'subject'));
      emailItem.children.push(subjectItem);
      addLiteralValue(subjectItem, 'subject');
      const contentItem = new FieldItem(emailItem, findField(email.fields, 'content'));
      emailItem.children.push(contentItem);
      addLiteralValue(contentItem, 'content');

      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(xslt).toContain('<WebhookMulti');
      expect(xslt).toContain('<content');
      expect(xslt.indexOf('<WebhookMulti')).toBeLessThan(xslt.indexOf('<Email'));
      expect(xslt.indexOf('<content')).toBeLessThan(xslt.indexOf('<subject'));
    });

    it('a copy-of anchored on one member does not jump ahead of a field item on a different member of the same repeating choice', () => {
      const { largeItem, choice2 } = buildLargeTree();
      const pushMulti = findField(choice2.fields, 'PushMulti');
      // Authored: field item (PushMulti) first, then a copy-of anchored on a *different* member
      // (WebhookMulti) of the same repeating choice. Both truncate to the same path (the choice's own
      // slot), but they do not share an anchor field — the copy-of-before-field-item tie-break must not
      // fire here, or it would wrongly force the copy-of ahead of PushMulti regardless of authored order.
      const pushMultiItem = new FieldItem(largeItem, pushMulti);
      largeItem.children.push(pushMultiItem);
      addLiteralValue(pushMultiItem, 'push');
      const copyOf = new CopyOfSelector(largeItem);
      copyOf.expression = '/ns0:Notification/ns0:Large/ns0:WebhookMulti';
      largeItem.children.push(copyOf);

      const xslt = MappingSerializerService.serialize(largeItem.mappingTree, new Map());
      expect(xslt.indexOf('<PushMulti>')).toBeLessThan(xslt.indexOf('xsl:copy-of'));
    });

    it('a copy-of shares an anchor with one FieldItem while a third item on a different member ties on the same truncated path: all three still sort deterministically', () => {
      // Guards transitivity of indifference: A (copy-of) and B (FieldItem) anchor on the same member
      // (WebhookMulti) and must pair up; C (FieldItem) anchors on a *different* member (PushMulti) of
      // the same repeating choice and ties with both A and B on the truncated path alone. A relational,
      // pairwise "shares an anchor" tie-break inside the comparator itself cannot order all three
      // consistently (A<B, B~C, A~C is not a valid total preorder), so that pairing lives in a
      // non-relational post-sort pass instead.
      const { largeItem, choice2 } = buildLargeTree();
      const webhookMulti = findField(choice2.fields, 'WebhookMulti');
      const pushMulti = findField(choice2.fields, 'PushMulti');

      // Authored order: C, B, A — the copy-of (A) is authored last, furthest from its own anchor (B).
      const pushMultiItem = new FieldItem(largeItem, pushMulti); // C
      largeItem.children.push(pushMultiItem);
      addLiteralValue(pushMultiItem, 'push');
      const webhookMultiItem = new FieldItem(largeItem, webhookMulti); // B
      largeItem.children.push(webhookMultiItem);
      addLiteralValue(webhookMultiItem, 'webhook');
      const copyOf = new CopyOfSelector(largeItem); // A
      copyOf.expression = '/ns0:Notification/ns0:Large/ns0:WebhookMulti';
      largeItem.children.push(copyOf);

      const xslt = MappingSerializerService.serialize(largeItem.mappingTree, new Map());
      const copyOfPos = xslt.indexOf('xsl:copy-of');
      const webhookMultiPos = xslt.indexOf('<WebhookMulti>');
      const pushMultiPos = xslt.indexOf('<PushMulti>');

      // A (copy-of) must end up immediately before its own anchor B (WebhookMulti) regardless of how
      // far apart they were authored...
      expect(copyOfPos).toBeLessThan(webhookMultiPos);
      // ...and C (PushMulti, unrelated anchor) must keep its authored position ahead of the A/B pair,
      // not be swept into the pairing just because it ties with them on the truncated path.
      expect(pushMultiPos).toBeLessThan(copyOfPos);
    });
  });

  describe('sequence inside a choice', () => {
    it.each([
      {
        element: 'SequenceInChoiceElement',
        schemaOrder: ['key', 'value'],
        keepsAuthoredOrder: false,
        description: 'a single choice sorts its sequence members by schema position',
      },
      {
        element: 'CollectionSequenceInChoiceElement',
        schemaOrder: ['seqKey', 'seqValue'],
        keepsAuthoredOrder: true,
        description: 'a repeating choice keeps its sequence members in authored order',
      },
    ])('$description', ({ element, schemaOrder, keepsAuthoredOrder }) => {
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'TestDocument.xsd': getTestDocumentXsd() },
      );
      const targetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      const root = findField(targetDoc.fields, 'TestDocument');
      const elementField = findField(root.fields, element);
      const sequence = elementField.fields[0].fields.find((f) => f.wrapperKind === 'sequence');
      if (!sequence) throw new Error(`no sequence wrapper inside the choice of ${element}`);

      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const rootItem = new FieldItem(tree, root);
      tree.children.push(rootItem);
      const elementItem = new FieldItem(rootItem, elementField);
      rootItem.children.push(elementItem);
      const authoredOrder = [...schemaOrder].reverse();
      for (const name of authoredOrder) {
        const memberItem = new FieldItem(elementItem, findField(sequence.fields, name));
        elementItem.children.push(memberItem);
        addLiteralValue(memberItem, name);
      }

      const xslt = MappingSerializerService.serialize(tree, new Map());
      const [before, after] = keepsAuthoredOrder ? authoredOrder : schemaOrder;
      expect(xslt).toContain(`<${before}>`);
      expect(xslt).toContain(`<${after}>`);
      expect(xslt.indexOf(`<${before}>`)).toBeLessThan(xslt.indexOf(`<${after}>`));
    });
  });

  describe('UnknownMappingItem (the second pre-existing defect, independent of #4389)', () => {
    it('no longer ties unconditionally: a plain sibling pair separated only by an unknown element still sorts by schema position', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <ShipOrder xmlns="io.kaoto.datamapper.poc.test">
            <ShipTo xmlns="">
                <Name><xsl:value-of select="/ns0:ShipOrder/ShipTo/Name"/></Name>
            </ShipTo>
            <xsl:apply-templates select="/ns0:ShipOrder/Item"/>
            <OrderPerson><xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/></OrderPerson>
        </ShipOrder>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, targetDoc, tree, new Map()));
      const shipOrderItem = tree.children[0] as FieldItem;
      expect(shipOrderItem.children.some((c) => c instanceof UnknownMappingItem)).toBe(true);

      const out = MappingSerializerService.serialize(tree, new Map());
      // OrderPerson (schema index 0) sorts before ShipTo (index 1). The unknown
      // apply-templates is a follower: it anchors to ShipTo (its nearest preceding non-follower sibling
      // in authored order) and stays immediately behind it rather than disappearing or moving elsewhere.
      expect(shipOrderChildNames(out)).toEqual(['OrderPerson', 'ShipTo', 'apply-templates']);
    });
  });

  describe('follower anchoring', () => {
    it('a field-less instruction keeps its authored position relative to its predecessor instead of sorting last', () => {
      const doc = createOrderDoc();
      const order = doc.fields[0];
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const orderItem = new FieldItem(tree, order);
      tree.children.push(orderItem);

      const totalAmountItem = new FieldItem(orderItem, findField(order.fields, 'TotalAmount'));
      orderItem.children.push(totalAmountItem);
      addLiteralValue(totalAmountItem, '42');

      // An xsl:if wrapping only an unresolvable (wildcard) copy-of resolves no anchor field at all,
      // so it is a follower: it must stay directly behind TotalAmount, not jump to the end.
      const fieldLessIf = new IfItem(orderItem);
      fieldLessIf.expression = '/ns0:Order/Id';
      const wildcardCopyOf = new CopyOfSelector(fieldLessIf);
      wildcardCopyOf.expression = '/ns0:Order/node()';
      fieldLessIf.children.push(wildcardCopyOf);
      orderItem.children.push(fieldLessIf);

      const idItem = new FieldItem(orderItem, findField(order.fields, 'Id'));
      orderItem.children.push(idItem);
      addLiteralValue(idItem, 'abc');

      const xslt = MappingSerializerService.serialize(tree, new Map());
      const body = xslt.substring(xslt.indexOf('<Order'), xslt.indexOf('</Order>'));
      expect(body.indexOf('<Id')).toBeLessThan(body.indexOf('<TotalAmount'));
      expect(body.indexOf('<TotalAmount')).toBeLessThan(body.indexOf('xsl:if'));
    });

    it('a chain of unknown elements stays together, anchored on the same predecessor', () => {
      const doc = createOrderDoc();
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
            <TotalAmount xmlns=""><xsl:value-of select="/ns0:Order/TotalAmount"/></TotalAmount>
            <xsl:apply-templates select="/ns0:Order/Id"/>
            <xsl:message select="'unused'"/>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
        </Order>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, doc, tree, new Map()));
      const orderItem = tree.children[0] as FieldItem;
      const unknownCount = orderItem.children.filter((c) => c instanceof UnknownMappingItem).length;
      expect(unknownCount).toBe(2);

      const out = MappingSerializerService.serialize(tree, new Map());
      const body = out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
      // Id (schema index 0) sorts first; TotalAmount (index 3) and both unknowns, anchored on
      // TotalAmount, must stay together directly behind it, in their original relative order.
      const idPos = body.indexOf('<Id');
      const totalAmountPos = body.indexOf('<TotalAmount');
      const applyTemplatesPos = body.indexOf('xsl:apply-templates');
      const messagePos = body.indexOf('xsl:message');
      expect(idPos).toBeLessThan(totalAmountPos);
      expect(totalAmountPos).toBeLessThan(applyTemplatesPos);
      expect(applyTemplatesPos).toBeLessThan(messagePos);
    });

    describe('after the predecessor changes', () => {
      const predecessorXslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
            <TotalAmount xmlns=""><xsl:value-of select="/ns0:Order/TotalAmount"/></TotalAmount>
            <ShipTo xmlns=""><Name xmlns=""><xsl:value-of select="/ns0:Order/ShipTo/Name"/></Name></ShipTo>
            <xsl:apply-templates select="/ns0:Order/Id"/>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
        </Order>
    </xsl:template>
</xsl:stylesheet>`;

      const loadOrderItem = (): FieldItem => {
        let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
        ({ mappingTree: tree } = MappingSerializerService.deserialize(
          predecessorXslt,
          createOrderDoc(),
          tree,
          new Map(),
        ));
        return tree.children[0] as FieldItem;
      };

      const findFieldItem = (orderItem: FieldItem, name: string): FieldItem => {
        const item = orderItem.children.find(
          (child): child is FieldItem => child instanceof FieldItem && child.field.name === name,
        );
        if (!item) throw new Error(`FieldItem "${name}" not found`);
        return item;
      };

      const orderBody = (orderItem: FieldItem): string => {
        const out = MappingSerializerService.serialize(orderItem.parent as MappingTree, new Map());
        return out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
      };

      it('stays behind its predecessor after the predecessor is wrapped in an xsl:if', () => {
        const orderItem = loadOrderItem();
        MappingService.wrapWithIf(findFieldItem(orderItem, 'ShipTo'));

        const body = orderBody(orderItem);
        expect(body).toContain('<Id');
        expect(body.indexOf('<Id')).toBeLessThan(body.indexOf('xsl:if'));
        expect(body.indexOf('xsl:if')).toBeLessThan(body.indexOf('<ShipTo'));
        expect(body.indexOf('<ShipTo')).toBeLessThan(body.indexOf('xsl:apply-templates'));
        expect(body.indexOf('xsl:apply-templates')).toBeLessThan(body.indexOf('<TotalAmount'));
      });

      it('re-anchors on the next earlier sibling after the predecessor is deleted', () => {
        const orderItem = loadOrderItem();
        const before = orderBody(orderItem);
        expect(before.indexOf('<ShipTo')).toBeLessThan(before.indexOf('xsl:apply-templates'));
        expect(before.indexOf('xsl:apply-templates')).toBeLessThan(before.indexOf('<TotalAmount'));

        MappingService.deleteMappingItem(findFieldItem(orderItem, 'ShipTo'));

        const after = orderBody(orderItem);
        expect(after).not.toContain('<ShipTo');
        expect(after).toContain('<Id');
        expect(after.indexOf('<Id')).toBeLessThan(after.indexOf('<TotalAmount'));
        expect(after.indexOf('<TotalAmount')).toBeLessThan(after.indexOf('xsl:apply-templates'));
      });
    });

    it('a follower anchors to a preceding leading copy-of sibling', () => {
      const doc = createOrderDoc();
      const order = doc.fields[0];
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
            <xsl:copy-of select=""/>
            <xsl:apply-templates select="/ns0:Order/Id"/>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
        </Order>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, doc, tree, new Map()));
      expect(findField(order.fields, 'Id')).toBeDefined();

      const out = MappingSerializerService.serialize(tree, new Map());
      const body = out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
      // The leading copy-of sorts first (before Id, an element). The unknown apply-templates anchors
      // to it (its nearest non-follower predecessor) and must stay directly behind it, ahead of Id.
      expect(body.indexOf('xsl:copy-of')).toBeLessThan(body.indexOf('xsl:apply-templates'));
      expect(body.indexOf('xsl:apply-templates')).toBeLessThan(body.indexOf('<Id'));
    });

    it('a follower authored between an anchored copy-of and its field item moves with the copy-of', () => {
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
            <xsl:copy-of select="/ns0:Order/ShipTo"/>
            <xsl:message select="'between'"/>
            <ShipTo xmlns=""><Name xmlns=""><xsl:value-of select="/ns0:Order/ShipTo/Name"/></Name></ShipTo>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
        </Order>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, createOrderDoc(), tree, new Map()));

      const out = MappingSerializerService.serialize(tree, new Map());
      const body = out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
      expect(body).toContain('<Id');
      expect(body.indexOf('<Id')).toBeLessThan(body.indexOf('xsl:copy-of'));
      expect(body.indexOf('xsl:copy-of')).toBeLessThan(body.indexOf('xsl:message'));
      expect(body.indexOf('xsl:message')).toBeLessThan(body.indexOf('<ShipTo'));
    });

    it('a first-position follower with no preceding anchor takes the FOLLOWER_FLOOR key, sorting before attributes and elements', () => {
      const doc = createOrderDoc();
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
            <xsl:apply-templates select="/ns0:Order/Id"/>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
        </Order>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, doc, tree, new Map()));
      const out = MappingSerializerService.serialize(tree, new Map());
      const body = out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
      // No preceding anchor exists, so the unknown apply-templates stays in FOLLOWER_FLOOR, ahead of Id
      // — authored order is preserved rather than the follower jumping past Id into ELEMENT.
      expect(body.indexOf('xsl:apply-templates')).toBeLessThan(body.indexOf('<Id'));
    });

    it("a variable between an anchor and a follower does not become the follower's anchor", () => {
      const doc = createOrderDoc();
      const order = doc.fields[0];
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const orderItem = new FieldItem(tree, order);
      tree.children.push(orderItem);

      // Authored: TotalAmount (anchor), a variable, then an unknown follower. The variable must not
      // overwrite TotalAmount as the follower's anchor, since variables are hoisted to the front and
      // anchoring to one would drag the follower ahead of its authored predecessor.
      const totalAmountItem = new FieldItem(orderItem, findField(order.fields, 'TotalAmount'));
      orderItem.children.push(totalAmountItem);
      addLiteralValue(totalAmountItem, '42');

      const variable = new VariableItem(orderItem, 'v1');
      variable.expression = "'x'";
      orderItem.children.push(variable);

      const unknownXslt = `<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
<xsl:template match="/"><Order xmlns="io.kaoto.datamapper.poc.test"><xsl:apply-templates select="/ns0:Order/Id"/></Order></xsl:template>
</xsl:stylesheet>`;
      const unknownDoc = new DOMParser().parseFromString(unknownXslt, 'application/xml');
      const unknownElement = unknownDoc.getElementsByTagNameNS(NS_XSL, 'apply-templates')[0];
      const unknown = new UnknownMappingItem(orderItem, unknownElement);
      orderItem.children.push(unknown);

      const xslt = MappingSerializerService.serialize(tree, new Map());
      const body = xslt.substring(xslt.indexOf('<Order'), xslt.indexOf('</Order>'));
      expect(body.indexOf('xsl:variable')).toBeLessThan(body.indexOf('<TotalAmount'));
      // The unknown item anchors to TotalAmount (its nearest non-follower, non-variable predecessor)
      // and stays immediately behind it, not behind the variable and not at the floor.
      expect(body.indexOf('<TotalAmount')).toBeLessThan(body.indexOf('xsl:apply-templates'));
    });

    it('an attribute is a valid follower anchor', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const shipOrder = targetDoc.fields[0];
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const shipOrderItem = new FieldItem(tree, shipOrder);
      tree.children.push(shipOrderItem);

      // Authored: an element (OrderPerson), then an attribute (OrderId), then an unknown follower.
      // The attribute becomes the new anchor; the follower must stay directly behind it, ahead of the
      // element it was authored after but now sorts behind in the ATTRIBUTE bucket.
      const orderPersonItem = new FieldItem(shipOrderItem, findField(shipOrder.fields, 'OrderPerson'));
      shipOrderItem.children.push(orderPersonItem);
      addLiteralValue(orderPersonItem, 'someone');

      const orderIdItem = new FieldItem(shipOrderItem, findField(shipOrder.fields, 'OrderId'));
      shipOrderItem.children.push(orderIdItem);
      addLiteralValue(orderIdItem, 'id-1');

      const unknownXslt = `<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
<xsl:template match="/"><ShipOrder xmlns="io.kaoto.datamapper.poc.test"><xsl:apply-templates select="/ns0:ShipOrder/Item"/></ShipOrder></xsl:template>
</xsl:stylesheet>`;
      const unknownDoc = new DOMParser().parseFromString(unknownXslt, 'application/xml');
      const unknownElement = unknownDoc.getElementsByTagNameNS(NS_XSL, 'apply-templates')[0];
      const unknown = new UnknownMappingItem(shipOrderItem, unknownElement);
      shipOrderItem.children.push(unknown);

      const xslt = MappingSerializerService.serialize(tree, new Map());
      const body = xslt.substring(xslt.indexOf('<ShipOrder'), xslt.indexOf('</ShipOrder>'));
      const attrPos = body.indexOf('xsl:attribute');
      const unknownPos = body.indexOf('xsl:apply-templates');
      const orderPersonPos = body.indexOf('<OrderPerson');
      expect(attrPos).toBeLessThan(unknownPos);
      expect(unknownPos).toBeLessThan(orderPersonPos);
    });
  });

  describe('instruction follower and attributes', () => {
    function createShipOrderTree() {
      const shipOrder = TestUtil.createTargetOrderDoc().fields[0];
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const shipOrderItem = new FieldItem(tree, shipOrder);
      tree.children.push(shipOrderItem);
      return { tree, shipOrder, shipOrderItem };
    }

    function addOrderIdItem(parent: FieldItem | IfItem, shipOrder: IField): void {
      const orderIdItem = new FieldItem(parent, findField(shipOrder.fields, 'OrderId'));
      parent.children.push(orderIdItem);
      addLiteralValue(orderIdItem, 'id-1');
    }

    function addFieldLessIf(parent: FieldItem): void {
      const fieldLessIf = new IfItem(parent);
      fieldLessIf.expression = 'true()';
      const valueOf = new ValueOfSelector(fieldLessIf);
      valueOf.expression = "'x'";
      fieldLessIf.children.push(valueOf);
      parent.children.push(fieldLessIf);
    }

    function addCallTemplate(parent: FieldItem): void {
      const unknownXslt = `<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}"><xsl:call-template name="extra"/></xsl:stylesheet>`;
      const unknownDoc = new DOMParser().parseFromString(unknownXslt, 'application/xml');
      const unknownElement = unknownDoc.getElementsByTagNameNS(NS_XSL, 'call-template')[0];
      parent.children.push(new UnknownMappingItem(parent, unknownElement));
    }

    function addLeadingCopyOf(parent: FieldItem): void {
      parent.children.push(new CopyOfSelector(parent));
    }

    function shipOrderBody(tree: MappingTree): string {
      const xslt = MappingSerializerService.serialize(tree, new Map());
      return xslt.substring(xslt.indexOf('<ShipOrder'), xslt.indexOf('</ShipOrder>'));
    }

    it('an instruction follower anchored on an attribute goes after every attribute', () => {
      const { tree, shipOrder, shipOrderItem } = createShipOrderTree();
      addOrderIdItem(shipOrderItem, shipOrder);
      addFieldLessIf(shipOrderItem);
      const conditionalAttribute = new IfItem(shipOrderItem);
      conditionalAttribute.expression = 'true()';
      addOrderIdItem(conditionalAttribute, shipOrder);
      shipOrderItem.children.push(conditionalAttribute);

      const body = shipOrderBody(tree);
      const fieldLessIfPos = body.indexOf('<xsl:value-of select="\'x\'"');
      expect(fieldLessIfPos).toBeGreaterThan(-1);
      expect(body.lastIndexOf('xsl:attribute')).toBeLessThan(fieldLessIfPos);
    });

    it('a first-position instruction follower goes after the attributes', () => {
      const { tree, shipOrder, shipOrderItem } = createShipOrderTree();
      addFieldLessIf(shipOrderItem);
      addOrderIdItem(shipOrderItem, shipOrder);

      const body = shipOrderBody(tree);
      expect(body).toContain('xsl:attribute');
      expect(body.indexOf('xsl:attribute')).toBeLessThan(body.indexOf('xsl:if'));
    });

    it('a for-each holding only a value-of goes after the attributes and keeps its authored position before an element', () => {
      const { tree, shipOrder, shipOrderItem } = createShipOrderTree();
      const forEach = new ForEachItem(shipOrderItem);
      forEach.expression = '/ns0:ShipOrder/Item';
      const valueOf = new ValueOfSelector(forEach);
      valueOf.expression = 'Title';
      forEach.children.push(valueOf);
      shipOrderItem.children.push(forEach);
      addOrderIdItem(shipOrderItem, shipOrder);
      const orderPersonItem = new FieldItem(shipOrderItem, findField(shipOrder.fields, 'OrderPerson'));
      shipOrderItem.children.push(orderPersonItem);
      addLiteralValue(orderPersonItem, 'someone');

      const body = shipOrderBody(tree);
      expect(body).toContain('xsl:attribute');
      expect(body.indexOf('xsl:attribute')).toBeLessThan(body.indexOf('xsl:for-each'));
      expect(body.indexOf('xsl:for-each')).toBeLessThan(body.indexOf('<OrderPerson'));
    });

    it.each([
      { anchor: 'no anchor', before: (_parent: FieldItem, _shipOrder: IField) => {} },
      { anchor: 'an attribute anchor', before: addOrderIdItem },
      { anchor: 'a leading copy-of anchor', before: addLeadingCopyOf },
    ])('an unknown item authored after an instruction follower with $anchor stays behind it', ({ before }) => {
      const { tree, shipOrder, shipOrderItem } = createShipOrderTree();
      before(shipOrderItem, shipOrder);
      addFieldLessIf(shipOrderItem);
      addCallTemplate(shipOrderItem);
      addOrderIdItem(shipOrderItem, shipOrder);

      const body = shipOrderBody(tree);
      expect(body).toContain('xsl:call-template');
      expect(body.lastIndexOf('xsl:attribute')).toBeLessThan(body.indexOf('xsl:if'));
      expect(body.indexOf('xsl:if')).toBeLessThan(body.indexOf('xsl:call-template'));
    });
  });

  describe('copy-of naming several fields', () => {
    const serializeOrderBody = (orderContent: string): string => {
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="io.kaoto.datamapper.poc.test">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <Order xmlns="io.kaoto.datamapper.poc.test">
${orderContent}
        </Order>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, createOrderDoc(), tree, new Map()));
      const out = MappingSerializerService.serialize(tree, new Map());
      return out.substring(out.indexOf('<Order'), out.indexOf('</Order>'));
    };

    it('stays at its earliest field when only a later field has a mapping', () => {
      const body = serializeOrderBody(`
            <xsl:copy-of select="/ns0:Order/Id | /ns0:Order/TotalAmount"/>
            <ShipTo xmlns=""><Name xmlns=""><xsl:value-of select="/ns0:Order/ShipTo/Name"/></Name></ShipTo>
            <TotalAmount xmlns=""><xsl:value-of select="/ns0:Order/TotalAmount"/></TotalAmount>`);
      expect(body).toContain('xsl:copy-of');
      expect(body.indexOf('xsl:copy-of')).toBeLessThan(body.indexOf('<ShipTo'));
      expect(body.indexOf('<ShipTo')).toBeLessThan(body.indexOf('<TotalAmount'));
    });

    it('moves before the mapping of its earliest field', () => {
      const body = serializeOrderBody(`
            <ShipTo xmlns=""><Name xmlns=""><xsl:value-of select="/ns0:Order/ShipTo/Name"/></Name></ShipTo>
            <Id xmlns=""><xsl:value-of select="/ns0:Order/Id"/></Id>
            <xsl:copy-of select="/ns0:Order/Id | /ns0:Order/TotalAmount"/>
            <TotalAmount xmlns=""><xsl:value-of select="/ns0:Order/TotalAmount"/></TotalAmount>`);
      expect(body).toContain('xsl:copy-of');
      expect(body.indexOf('xsl:copy-of')).toBeLessThan(body.indexOf('<Id'));
      expect(body.indexOf('<Id')).toBeLessThan(body.indexOf('<ShipTo'));
      expect(body.indexOf('<ShipTo')).toBeLessThan(body.indexOf('<TotalAmount'));
    });
  });

  describe('leading copy-of outranks an attribute', () => {
    it('an empty copy-of sorts before an attribute', () => {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const shipOrder = targetDoc.fields[0];
      const orderId = findField(shipOrder.fields, 'OrderId');
      expect(orderId.isAttribute).toBe(true);

      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const shipOrderItem = new FieldItem(tree, shipOrder);
      tree.children.push(shipOrderItem);
      shipOrderItem.children.push(new FieldItem(shipOrderItem, orderId));
      shipOrderItem.children.push(new CopyOfSelector(shipOrderItem));

      const xslt = MappingSerializerService.serialize(tree, new Map());
      expect(xslt.indexOf('xsl:copy-of')).toBeLessThan(xslt.indexOf('xsl:attribute'));
    });
  });

  describe('xsl:when / xsl:otherwise', () => {
    it('keeps sibling when branches in authored order and otherwise stays last, regardless of attribute or element content', () => {
      const doc = createDocWithAttributeChoice();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const orderItem = new FieldItem(tree, doc.fields[0]);
      tree.children.push(orderItem);
      const choose = new ChooseItem(orderItem);
      orderItem.children.push(choose);

      // when1 wraps an attribute (would otherwise outrank elements); when2 maps a plain element with a
      // later schema index. Authored order must win over both.
      const when1 = new WhenItem(choose);
      when1.expression = "/ns0:Order/Id = 'first'";
      when1.children.push(new FieldItem(when1, findField(doc.fields[0].fields, 'OrderId')));
      choose.children.push(when1);

      const when2 = new WhenItem(choose);
      when2.expression = "/ns0:Order/Id = 'second'";
      when2.children.push(new FieldItem(when2, findField(doc.fields[0].fields, 'ShipTo')));
      choose.children.push(when2);

      const otherwise = new OtherwiseItem(choose);
      otherwise.children.push(new FieldItem(otherwise, findField(doc.fields[0].fields, 'OrderPerson')));
      choose.children.push(otherwise);

      const out = MappingSerializerService.serialize(tree, new Map());
      expect(out.indexOf('first')).toBeLessThan(out.indexOf('second'));
      expect(out.indexOf('xsl:when')).toBeLessThan(out.lastIndexOf('xsl:otherwise'));
    });
  });

  describe('permutation', () => {
    it('every permutation of a mixed item set serializes in the same, schema-correct order', () => {
      const doc = createOrderDoc();
      const order = doc.fields[0];

      type Spec = { name: string; build: (parent: FieldItem) => FieldItem['children'][number] };
      const specs: Spec[] = [
        {
          name: 'variable',
          build: (parent) => {
            const v = new VariableItem(parent, 'v1');
            v.expression = "'x'";
            return v;
          },
        },
        { name: 'id', build: (parent) => new FieldItem(parent, findField(order.fields, 'Id')) },
        { name: 'shipTo', build: (parent) => new FieldItem(parent, findField(order.fields, 'ShipTo')) },
        { name: 'totalAmount', build: (parent) => new FieldItem(parent, findField(order.fields, 'TotalAmount')) },
        {
          name: 'forEachItem',
          build: (parent) => {
            const fe = new ForEachItem(parent);
            fe.expression = '/ns0:Order/Item';
            fe.children.push(
              new FieldItem(fe, findField(order.fields, 'Item').fields.find((f) => f.name === 'Title')!),
            );
            return fe;
          },
        },
      ];

      const expectedRank = ['variable', 'id', 'shipTo', 'forEachItem', 'totalAmount'];

      for (const permutation of permutations(specs)) {
        const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
        const orderItem = new FieldItem(tree, order);
        tree.children.push(orderItem);
        const built = permutation.map((spec) => ({ name: spec.name, item: spec.build(orderItem) }));
        for (const { item } of built) orderItem.children.push(item);

        const xslt = MappingSerializerService.serialize(tree, new Map());
        const positions = built.map(({ name }) => ({ name, pos: findFirstPosition(xslt, name) }));
        const actualRank = [...positions].sort((a, b) => a.pos - b.pos).map((p) => p.name);
        expect(actualRank).toEqual(expectedRank);
      }
    });
  });

  describe('JSON target', () => {
    it('two instruction-wrapped properties authored in reverse order serialize in schema order', () => {
      // ShipOrder.schema.json property order: OrderId (0), OrderPerson (1), ... — authored in reverse,
      // each guarded by an xsl:if, so this exercises the same ELEMENT-bucket ordering logic against a
      // JsonSchemaField tree instead of an XmlSchemaField one.
      const targetDoc = TestUtil.createJSONTargetOrderDoc();
      const xslt = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="${NS_XSL}" version="3.0" xmlns:fn="http://www.w3.org/2005/xpath-functions">
    <xsl:output method="text" indent="yes"/>
    <xsl:variable name="mapped-xml">
        <map xmlns="http://www.w3.org/2005/xpath-functions">
            <xsl:if test="true()">
                <string key="OrderPerson"><xsl:value-of select="'alice'"/></string>
            </xsl:if>
            <xsl:if test="true()">
                <string key="OrderId"><xsl:value-of select="'id-1'"/></string>
            </xsl:if>
        </map>
    </xsl:variable>
    <xsl:template match="/">
        <xsl:value-of select="xml-to-json($mapped-xml)"/>
    </xsl:template>
</xsl:stylesheet>`;
      let tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
      ({ mappingTree: tree } = MappingSerializerService.deserialize(xslt, targetDoc, tree, new Map()));
      const out = MappingSerializerService.serialize(tree, new Map());
      expect(out.indexOf('key="OrderId"')).toBeLessThan(out.indexOf('key="OrderPerson"'));
    });
  });

  describe('compareSerializationKeys contract', () => {
    // Bracket access into a private static, matching the precedent in step-parser.test.ts. The
    // comparator is a pure function of `(leftKey, rightKey)` with no access to the items being
    // compared, which is what makes these contract checks meaningful over keys alone.
    type Key = { bucket: MappingItemOrderBucket; path: number[] };
    const compare = (a: Key, b: Key): number =>
      (
        MappingSerializerService as unknown as {
          compareSerializationKeys: (a: Key, b: Key) => number;
        }
      ).compareSerializationKeys(a, b);
    const sign = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

    // One representative key per bucket, plus several ELEMENT keys at different and overlapping
    // (prefix-sharing) paths, so the triple checks below exercise both the bucket-rank branch and the
    // path-comparison branch of the comparator.
    const keys: Key[] = [
      { bucket: MappingItemOrderBucket.VARIABLE, path: [] },
      { bucket: MappingItemOrderBucket.LEADING_COPY_OF, path: [] },
      { bucket: MappingItemOrderBucket.FOLLOWER_FLOOR, path: [] },
      { bucket: MappingItemOrderBucket.ATTRIBUTE, path: [] },
      { bucket: MappingItemOrderBucket.ATTRIBUTE_COPY, path: [] },
      { bucket: MappingItemOrderBucket.ATTRIBUTES_AND_CHILDREN, path: [] },
      { bucket: MappingItemOrderBucket.CONTENT_FOLLOWER, path: [] },
      { bucket: MappingItemOrderBucket.ELEMENT, path: [0] },
      { bucket: MappingItemOrderBucket.ELEMENT, path: [1] },
      { bucket: MappingItemOrderBucket.ELEMENT, path: [1, 0] },
      { bucket: MappingItemOrderBucket.ELEMENT, path: [1, 2] },
      { bucket: MappingItemOrderBucket.ELEMENT, path: [2, 0] },
      { bucket: MappingItemOrderBucket.NO_FIELD, path: [] },
      { bucket: MappingItemOrderBucket.WHEN, path: [] },
      { bucket: MappingItemOrderBucket.OTHERWISE, path: [] },
    ];

    it('is antisymmetric: sign(cmp(a,b)) === -sign(cmp(b,a)) for every pair', () => {
      for (const a of keys) {
        for (const b of keys) {
          // sign(x) + sign(-x) is always a "clean" 0 by addition; asserting -sign(...) directly would
          // produce IEEE754 -0 for the tied case, which toBe (Object.is) treats as unequal to +0.
          expect(sign(compare(a, b)) + sign(compare(b, a))).toBe(0);
        }
      }
    });

    it('is transitive: a<b and b<c implies a<c, over every triple', () => {
      for (const a of keys) {
        for (const b of keys) {
          for (const c of keys) {
            if (compare(a, b) < 0 && compare(b, c) < 0) {
              expect(compare(a, c)).toBeLessThan(0);
            }
          }
        }
      }
    });

    it('is substitution-safe: cmp(a,b)==0 implies sign(cmp(a,c)) === sign(cmp(b,c)) for every c', () => {
      for (const a of keys) {
        for (const b of keys) {
          if (compare(a, b) !== 0) continue;
          for (const c of keys) {
            expect(sign(compare(a, c))).toBe(sign(compare(b, c)));
          }
        }
      }
    });
  });
});

describe('MappingSerializerService — attribute-writing items', () => {
  const SHIP_ORDER_NS = 'io.kaoto.datamapper.poc.test';
  const SIMPLE_NS = 'http://www.example.com/SIMPLE';
  const ANNOTATED_NS = 'http://www.example.com/annotated';

  const wrap = (root: string, namespace: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" xmlns:ns0="${namespace}">
    <xsl:output method="xml" indent="yes"/>
    <xsl:template match="/">
        <${root} xmlns="${namespace}">${body}</${root}>
    </xsl:template>
</xsl:stylesheet>`;
  const wrapShipOrder = (body: string) => wrap('ShipOrder', SHIP_ORDER_NS, body);
  const wrapCustomer = (body: string) => wrap('Customer', ANNOTATED_NS, body);

  const orderPerson = '<OrderPerson><xsl:value-of select="/ns0:ShipOrder/ns0:OrderPerson"/></OrderPerson>';
  const orderId = '<xsl:attribute name="OrderId"><xsl:value-of select="/ns0:ShipOrder/@OrderId"/></xsl:attribute>';
  const shipTo = '<ShipTo xmlns=""><Name><xsl:value-of select="/ns0:ShipOrder/ShipTo/Name"/></Name></ShipTo>';
  const item = '<Item xmlns=""><Title><xsl:value-of select="/ns0:ShipOrder/Item/Title"/></Title></Item>';
  const copyOf = (select: string) => `<xsl:copy-of select="${select}"/>`;
  const copyOfMarker = (select: string) => `copy-of select="${select}"`;
  const applyTemplates = '<xsl:apply-templates select="/ns0:ShipOrder/Item"/>';
  const customerAttribute = (name: string) =>
    `<xsl:attribute name="${name}"><xsl:value-of select="'${name}-value'"/></xsl:attribute>`;

  const ALL_ATTRIBUTES = '/ns0:ShipOrder/@*';
  const ATTRIBUTES_AND_NODES = '/ns0:ShipOrder/@* | /ns0:ShipOrder/node()';

  const createCustomerDoc = () =>
    XmlSchemaDocumentService.createXmlSchemaDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, BODY_DOCUMENT_ID, {
        'AnnotatedFields.xsd': getAnnotatedFieldsXsd(),
      }),
    ).document!;

  /** Deserializes `xslt`, serializes it, and checks that a reload serializes to the same text. */
  function serializeRoundTrip(
    xslt: string,
    createDoc: () => IDocument = () => TestUtil.createTargetOrderDoc(),
  ): string {
    const load = (text: string) => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      return MappingSerializerService.deserialize(text, createDoc(), tree, new Map()).mappingTree;
    };
    const first = MappingSerializerService.serialize(load(xslt), new Map());
    expect(MappingSerializerService.serialize(load(first), new Map())).toEqual(first);
    return first;
  }

  function expectInOrder(text: string, ...markers: string[]): void {
    const positions = markers.map((marker) => {
      const position = text.indexOf(marker);
      expect(position, `"${marker}" not found`).toBeGreaterThan(-1);
      return position;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  }

  describe('attribute copies', () => {
    it.each([
      ['@*', ALL_ATTRIBUTES],
      ['@* | node()', ATTRIBUTES_AND_NODES],
      ['attribute::*', '/ns0:ShipOrder/attribute::*'],
      ['@OrderId', '/ns0:ShipOrder/@OrderId'],
    ])('writes a copy-of selecting %s after xsl:attribute and before the elements', (_name, select) => {
      const out = serializeRoundTrip(wrapShipOrder(orderPerson + copyOf(select) + orderId));
      expectInOrder(out, 'name="OrderId"', copyOfMarker(select), '<OrderPerson');
    });

    it('moves the attribute copy of an imported stylesheet before the element it was authored after', () => {
      const out = serializeRoundTrip(getShipOrderAttributeCopyOfXslt());
      expectInOrder(out, copyOfMarker(ALL_ATTRIBUTES), '<OrderPerson');
    });

    it('writes a copy-of of the attributes of a simple-content element before its value', () => {
      const out = serializeRoundTrip(
        wrap(
          'Product',
          SIMPLE_NS,
          '<name><xsl:value-of select="/ns0:Product/ns0:name"/><xsl:copy-of select="/ns0:Product/ns0:name/@*"/></name>',
        ),
        () => TestUtil.createExtensionSimpleDoc(),
      );
      expectInOrder(out, 'copy-of select="/ns0:Product/ns0:name/@*"', 'value-of select="/ns0:Product/ns0:name"');
    });

    it('writes a copy-of that also returns an element with the attributes, not in front of that element', () => {
      const select = '/ns0:ShipOrder/@* | /ns0:ShipOrder/ShipTo';
      const out = serializeRoundTrip(wrapShipOrder(orderPerson + shipTo + copyOf(select)));
      expectInOrder(out, copyOfMarker(select), '<OrderPerson', '<ShipTo');
    });

    it('keeps two items that each write attributes and children in authored order, after an attributes-only item', () => {
      const first = ATTRIBUTES_AND_NODES;
      const second = '/ns0:ShipOrder/attribute::* | /ns0:ShipOrder/Item';
      const attributeOnly = '/ns0:ShipOrder/@OrderId';
      const out = serializeRoundTrip(
        wrapShipOrder(orderPerson + copyOf(first) + copyOf(second) + copyOf(attributeOnly)),
      );
      expectInOrder(out, copyOfMarker(attributeOnly), copyOfMarker(first), copyOfMarker(second), '<OrderPerson');
    });
  });

  describe('attribute copies among several xsl:attribute fields', () => {
    it.each([
      ['directly under the element', (content: string) => content],
      ['inside an xsl:if', (content: string) => `<xsl:if test="true()">${content}</xsl:if>`],
    ])('writes an attribute copy %s after every xsl:attribute field', (_name, wrapContent) => {
      const select = '/ns0:Customer/@*';
      const out = serializeRoundTrip(
        wrapCustomer(
          wrapContent(
            `<name><xsl:value-of select="'n'"/></name>` +
              customerAttribute('id') +
              `<xsl:copy-of select="${select}"/>` +
              customerAttribute('status'),
          ),
        ),
        createCustomerDoc,
      );
      expectInOrder(out, 'name="id"', 'name="status"', copyOfMarker(select), '<name');
    });
  });

  describe('instructions that write attributes', () => {
    it('writes an attribute authored after an xsl:if that writes an attribute and an element before the xsl:if', () => {
      const out = serializeRoundTrip(
        wrapCustomer(
          `<xsl:if test="true()">${customerAttribute('id')}<name><xsl:value-of select="'n'"/></name></xsl:if>` +
            customerAttribute('status'),
        ),
        createCustomerDoc,
      );
      expectInOrder(out, 'name="status"', '<xsl:if', 'name="id"', '<name');
    });

    it('orders an xsl:if body: the attribute copy goes before the element', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(`<xsl:if test="true()">${shipTo}${copyOf(ALL_ATTRIBUTES)}</xsl:if>`),
      );
      expectInOrder(out, '<xsl:if', copyOfMarker(ALL_ATTRIBUTES), '<ShipTo');
    });

    it('orders an xsl:when body: the attribute copy goes before the element', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(`<xsl:choose><xsl:when test="true()">${shipTo}${copyOf(ALL_ATTRIBUTES)}</xsl:when></xsl:choose>`),
      );
      expectInOrder(out, '<xsl:when', copyOfMarker(ALL_ATTRIBUTES), '<ShipTo');
    });

    it('writes a for-each over the attributes before the element it was authored after', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(
          `${orderPerson}<xsl:for-each select="${ALL_ATTRIBUTES}"><xsl:copy-of select="."/></xsl:for-each>`,
        ),
      );
      expectInOrder(out, 'xsl:for-each', '<OrderPerson');
    });

    it('writes a copy-of of the loop item inside an element under a for-each over the attributes before its child', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(
          `<xsl:for-each select="${ALL_ATTRIBUTES}"><Item xmlns=""><Title><xsl:value-of select="'t'"/></Title>` +
            '<xsl:copy-of select="."/></Item></xsl:for-each>',
        ),
      );
      expectInOrder(out, 'copy-of select="."', '<Title');
    });

    it('writes a copy-of of the attributes inside a looped element before its child', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(
          '<xsl:for-each select="/ns0:ShipOrder/Item"><Item xmlns=""><Title><xsl:value-of select="Title"/></Title>' +
            '<xsl:copy-of select="@*"/></Item></xsl:for-each>',
        ),
      );
      expectInOrder(out, 'copy-of select="@*"', '<Title');
    });
  });

  describe('followers', () => {
    it('writes a field-less instruction between two attribute copies after both of them', () => {
      const attributeOnly = '/ns0:ShipOrder/@OrderId';
      const out = serializeRoundTrip(
        wrapShipOrder(
          orderPerson +
            copyOf(ALL_ATTRIBUTES) +
            `<xsl:if test="true()"><xsl:value-of select="'x'"/></xsl:if>` +
            copyOf(attributeOnly),
        ),
      );
      expectInOrder(out, copyOfMarker(ALL_ATTRIBUTES), copyOfMarker(attributeOnly), '<xsl:if', '<OrderPerson');
    });

    it('keeps two field-less instructions around an xsl:if writing an attribute and an element in authored order', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(
          `<xsl:if test="true()"><xsl:value-of select="'a'"/></xsl:if>` +
            `<xsl:if test="true()">${orderId}${orderPerson}</xsl:if>` +
            `<xsl:if test="true()"><xsl:value-of select="'b'"/></xsl:if>`,
        ),
      );
      expectInOrder(out, 'name="OrderId"', `select="'a'"`, `select="'b'"`);
    });

    it('keeps the attribute copy of an imported stylesheet before an unknown element', () => {
      const out = serializeRoundTrip(getUnknownApplyTemplateAfterAttributeCopyOfXslt());
      expectInOrder(out, 'name="OrderId"', copyOfMarker(ALL_ATTRIBUTES), 'xsl:apply-templates');
    });

    it.each([
      {
        name: 'a chain of unknown elements anchored on an attribute after an attribute copy',
        body: copyOf(ALL_ATTRIBUTES) + orderId + applyTemplates + `<xsl:message select="'m'"/>`,
        expected: ['name="OrderId"', copyOfMarker(ALL_ATTRIBUTES), 'xsl:apply-templates', 'xsl:message'],
      },
      {
        name: 'an unknown element anchored on an attribute after a mixed copy-of',
        body: copyOf(ATTRIBUTES_AND_NODES) + orderId + applyTemplates,
        expected: ['name="OrderId"', copyOfMarker(ATTRIBUTES_AND_NODES), 'xsl:apply-templates'],
      },
      {
        name: 'an unknown element anchored on a blank copy-of after an attribute copy',
        body: copyOf(ALL_ATTRIBUTES) + copyOf('') + applyTemplates,
        expected: [copyOfMarker(''), copyOfMarker(ALL_ATTRIBUTES), 'xsl:apply-templates'],
      },
      {
        name: 'an unknown element anchored on an attribute copy after a mixed copy-of',
        body: copyOf(ATTRIBUTES_AND_NODES) + copyOf(ALL_ATTRIBUTES) + applyTemplates,
        expected: [copyOfMarker(ALL_ATTRIBUTES), copyOfMarker(ATTRIBUTES_AND_NODES), 'xsl:apply-templates'],
      },
    ])('keeps $name after every earlier attribute writer', ({ body, expected }) => {
      const out = serializeRoundTrip(wrapShipOrder(body));
      expectInOrder(out, ...expected);
    });

    it('keeps an unknown element between two attributes in authored order without an attribute copy', () => {
      const out = serializeRoundTrip(
        wrapCustomer(customerAttribute('id') + '<xsl:call-template name="extra"/>' + customerAttribute('status')),
        createCustomerDoc,
      );
      expectInOrder(out, 'name="id"', 'xsl:call-template', 'name="status"');
    });
  });

  describe('items that write no attributes keep their placement', () => {
    it('keeps a blank copy-of first', () => {
      const out = serializeRoundTrip(wrapShipOrder(orderId + copyOf('')));
      expectInOrder(out, copyOfMarker(''), 'name="OrderId"');
    });

    it('keeps an empty-sequence copy-of last', () => {
      const out = serializeRoundTrip(wrapShipOrder(copyOf('()') + orderPerson));
      expectInOrder(out, '<OrderPerson', copyOfMarker('()'));
    });

    it('keeps an xsl:if holding only a variable behind its predecessor', () => {
      const out = serializeRoundTrip(
        wrapShipOrder(`${shipTo}<xsl:if test="true()"><xsl:variable name="v" select="1"/></xsl:if>${item}`),
      );
      expectInOrder(out, '<ShipTo', '<xsl:if', '<Item');
    });

    it('keeps a copy-of whose predicate reads an attribute with the element it selects', () => {
      const select = "/ns0:ShipOrder/Item[@type = 'a']";
      const out = serializeRoundTrip(wrapShipOrder(item + copyOf(select) + orderPerson));
      expectInOrder(out, '<OrderPerson', copyOfMarker(select), '<Item');
    });

    it('keeps a copy-of of an attribute string value after every element', () => {
      const select = 'string(/ns0:ShipOrder/@OrderId)';
      const out = serializeRoundTrip(wrapShipOrder(copyOf(select) + orderPerson));
      expectInOrder(out, '<OrderPerson', copyOfMarker(select));
    });
  });
});

function createOrderDoc() {
  const definition = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.XML_SCHEMA,
    BODY_DOCUMENT_ID,
    {
      'CopyOfSequenceOrder.xsd': getCopyOfSequenceOrderXsd(),
    },
  );
  return XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
}

function createDocWithAttributeChoice() {
  return TestUtil.createTargetOrderDoc();
}

function findFirstPosition(xslt: string, name: string): number {
  const markers: Record<string, string> = {
    variable: 'xsl:variable',
    id: '<Id',
    shipTo: '<ShipTo',
    totalAmount: '<TotalAmount',
    forEachItem: 'xsl:for-each',
  };
  const marker = markers[name];
  const pos = xslt.indexOf(marker);
  if (pos === -1) throw new Error(`marker "${marker}" for "${name}" not found in output`);
  return pos;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([items[i], ...perm]);
    }
  }
  return result;
}
