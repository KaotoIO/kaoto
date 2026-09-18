import { describe, expect, it } from 'vitest';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  RootElementOption,
} from '../../models/datamapper/document';
import { FieldItem, IfItem, MappingParentType, MappingTree, ValueOfSelector } from '../../models/datamapper/mapping';
import { NodeData, TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { getChoiceWithAbstractXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document/document-util.service';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingLinksService } from './mapping-links.service';
import { VisualizationService } from './visualization.service';

const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';
const NOTIFICATION_ROOT: RootElementOption = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };
const SOURCE_NAMESPACE_MAP = { ns0: 'io.kaoto.datamapper.poc.test' };
const SOURCE_EXPRESSION = '/ns0:ShipOrder/ns0:OrderPerson';

function createTargetDoc(): IDocument {
  const def = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.XML_SCHEMA,
    BODY_DOCUMENT_ID,
    { 'ChoiceWithAbstract.xsd': getChoiceWithAbstractXsd() },
    NOTIFICATION_ROOT,
  );
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(def);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
  }
  return result.document;
}

/** `Notification/Large`, its `maxOccurs = 1` choice wrapper, and `Webhook` selected as the member. */
function createSelectedWrapperFixture() {
  const targetDoc = createTargetDoc();
  const rootField = DocumentUtilService.resolveTypeFragment(targetDoc.fields[0]);
  const largeField = DocumentUtilService.resolveTypeFragment(rootField.fields.find((f) => f.name === 'Large')!);
  const choiceField = largeField.fields.find((f) => f.wrapperKind === 'choice' && f.maxOccurs === 1)!;
  const webhookIndex = choiceField.fields.findIndex((f) => f.name === 'Webhook');
  choiceField.selectedMemberIndex = webhookIndex;
  const webhookField = choiceField.fields[webhookIndex];

  const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  mappingTree.namespaceMap = { ...SOURCE_NAMESPACE_MAP };
  const rootItem = new FieldItem(mappingTree, rootField);
  mappingTree.children.push(rootItem);
  const largeItem = new FieldItem(rootItem, largeField);
  rootItem.children.push(largeItem);

  return { targetDoc, largeField, choiceField, webhookField, mappingTree, largeItem };
}

function mapWebhook(parent: MappingParentType, webhookField: IField): FieldItem {
  const webhookItem = new FieldItem(parent, webhookField);
  const selector = new ValueOfSelector(webhookItem);
  selector.expression = SOURCE_EXPRESSION;
  webhookItem.children.push(selector);
  parent.children.push(webhookItem);
  return webhookItem;
}

/** Walks the visual tree the renderer actually produces, down to the node showing `Webhook`. */
function renderedWebhookPath(targetDoc: IDocument, mappingTree: MappingTree): string {
  const docNode = new TargetDocumentNodeData(targetDoc, mappingTree);
  const descend = (node: NodeData, depth: number): NodeData | undefined => {
    if (node.title === 'Webhook' && depth > 0) return node;
    if (depth > 6) return undefined;
    for (const child of VisualizationService.generateNodeDataChildren(node)) {
      const found = descend(child, depth + 1);
      if (found) return found;
    }
    return undefined;
  };
  const webhookNode = descend(docNode, 0);
  if (!webhookNode) throw new Error('Webhook node is not rendered');
  return webhookNode.path.toString();
}

function linkTargetPath(mappingTree: MappingTree): string {
  const links = MappingLinksService.extractMappingLinks(
    mappingTree,
    TestUtil.createParameterMap(),
    TestUtil.createSourceOrderDoc(),
  );
  if (links.length !== 1) throw new Error(`expected exactly one mapping link, got ${links.length}`);
  return links[0].targetNodePath;
}

/**
 * Pins where a selected wrapper member renders versus where its mapping link points, ahead of the
 * visual-path refactoring.
 *
 * `MappingLinksService.computeVisualTargetNodePath` substitutes `field.id` for every selected
 * wrapper member. `VisualizationService.generateCollectionWrapperNodes` does not: it falls through
 * to a `FieldItemNodeData`, whose segment is the mapping id, whenever an `InstructionItem` sibling
 * touches the wrapper — independently of cardinality. So wrapping a selected member in `xsl:if`
 * makes the link address a node that is not there.
 *
 * The control tests are permanent. They assert the fixture can show that at all: that the member's
 * parent really is the wrapper and the wrapper really carries the selection, that the member's type
 * fragment resolved, and that without the `xsl:if` the two paths agree. Without them a broken
 * fixture would report agreement and read as "no divergence".
 *
 * The `defect` block records the current behaviour on purpose and **inverts when the two derivations
 * are unified behind one authority**, which is the first step of the visual-path epic. A red test
 * here after that change is the planned outcome, not a regression.
 */
describe('selected wrapper member inside an instruction: rendered path vs mapping link', () => {
  describe('controls — permanent assertions, true before and after any fix', () => {
    it('should parent Webhook on the choice wrapper and record it as the selected member', () => {
      const { choiceField, webhookField } = createSelectedWrapperFixture();

      expect(webhookField.parent).toBe(choiceField);
      expect(choiceField.wrapperKind).toBe('choice');
      expect(choiceField.maxOccurs).toBe(1);
      expect(DocumentUtilService.getSelectedMember(choiceField)).toBe(webhookField);
    });

    it('should resolve the Large type fragment so the choice wrapper has members', () => {
      const { largeField, choiceField } = createSelectedWrapperFixture();

      expect(largeField.fields.length).toBeGreaterThan(0);
      expect(choiceField.fields.map((f) => f.name)).toContain('Webhook');
    });

    it('should agree on the path when the member is mapped directly', () => {
      const { targetDoc, webhookField, mappingTree, largeItem } = createSelectedWrapperFixture();
      mapWebhook(largeItem, webhookField);

      expect(linkTargetPath(mappingTree)).toBe(renderedWebhookPath(targetDoc, mappingTree));
    });
  });

  describe('defect — inverts when the visual path derivations are unified', () => {
    it('should point the mapping link at a node that is not rendered when the member is wrapped in xsl:if', () => {
      const { targetDoc, webhookField, mappingTree, largeItem } = createSelectedWrapperFixture();
      const ifItem = new IfItem(largeItem);
      largeItem.children.push(ifItem);
      const webhookItem = mapWebhook(ifItem, webhookField);

      const rendered = renderedWebhookPath(targetDoc, mappingTree);
      const link = linkTargetPath(mappingTree);

      expect(rendered).not.toBe(link);
      expect(rendered.endsWith(`/${webhookItem.id}`)).toBe(true);
      expect(link.endsWith(`/${webhookField.id}`)).toBe(true);
      expect(rendered.startsWith(`${mappingTree.nodePath.toString()}`)).toBe(true);
    });
  });
});
