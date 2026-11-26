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
import { IMemberSelection } from '../../models/datamapper/field-action';
import { FieldItem, IfItem, MappingTree, ValueOfSelector } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData, TargetFieldNodeData } from '../../models/datamapper/visualization';
import { getChoiceWithAbstractXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingService } from '../mapping/mapping.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { AbstractFieldService } from './abstract-field.service';
import { ChoiceFieldService } from './choice-field.service';

const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';
const NOTIFICATION_ROOT: RootElementOption = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };
const NAMESPACE_MAP = { ns0: NS_CHOICE_ABSTRACT };

function createTargetDoc(): IDocument {
  const def = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.XML_SCHEMA,
    BODY_DOCUMENT_ID,
    { 'ChoiceWithAbstract.xsd': getChoiceWithAbstractXsd() },
    NOTIFICATION_ROOT,
  );
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(def, { ...NAMESPACE_MAP });
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
  }
  return result.document;
}

function findChoiceWrapper(targetDoc: IDocument): IField {
  const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
  return short!.fields.find((f) => f.wrapperKind === 'choice' && f.maxOccurs === 1)!;
}

function findAbstractWrapper(targetDoc: IDocument): IField {
  return findChoiceWrapper(targetDoc).fields.find((f) => f.wrapperKind === 'abstract')!;
}

function substitute(nodeData: TargetFieldNodeData, wrapper: IField, qname: string) {
  AbstractFieldService.applyAbstractSubstitution(nodeData, wrapper, qname, {}, wrapper, NAMESPACE_MAP, true);
}

/**
 * Changing a target wrapper's selected member must not carry the outgoing member's mapped
 * children onto the incoming one: they were mapped against fields the incoming member need not
 * declare, and they serialize, so the XSLT would gain a schema-invalid element carrying data.
 *
 * The control tests assert the fixture is capable of showing that at all — `Email_t` declaring
 * `subject` where `SMS_t` does not — which is what makes the member-change tests meaningful
 * rather than merely green.
 */
describe('selection move and the outgoing member’s children', () => {
  describe('controls — permanent assertions, true before and after any fix', () => {
    it('should declare subject on Email_t only, and phoneNumber on SMS_t only', () => {
      const targetDoc = createTargetDoc();
      const abstractWrapper = findAbstractWrapper(targetDoc);

      const email = abstractWrapper.fields.find((f) => f.name === 'Email');
      const sms = abstractWrapper.fields.find((f) => f.name === 'SMS');
      expect(email).toBeDefined();
      expect(sms).toBeDefined();

      const childNames = (field: IField) => DocumentUtilService.resolveTypeFragment(field).fields.map((f) => f.name);
      expect(childNames(email!)).toContain('subject');
      expect(childNames(email!)).not.toContain('phoneNumber');
      expect(childNames(sms!)).toContain('phoneNumber');
      expect(childNames(sms!)).not.toContain('subject');
    });

    it('should hold a subject child under the Email FieldItem after the mapping step', () => {
      const { mappingTree, wrapperNode, abstractWrapper } = createSetup();

      const emailItem = selectEmailWithMappedSubject(mappingTree, wrapperNode, abstractWrapper);

      expect(emailItem.children).toHaveLength(1);
      expect((emailItem.children[0] as FieldItem).field.name).toBe('subject');
    });
  });

  describe('member change discards the outgoing member’s children', () => {
    it('should not emit subject inside SMS after substituting Email with SMS', () => {
      const { mappingTree, wrapperNode, abstractWrapper } = createSetup();
      const emailItem = selectEmailWithMappedSubject(mappingTree, wrapperNode, abstractWrapper);

      const before = serialize(mappingTree);
      expect(before).toMatch(/<[^>]*Email[^>]*>\s*<[^>]*subject/);

      wrapperNode.mapping = emailItem;
      substitute(wrapperNode, abstractWrapper, 'ns0:SMS');

      const smsItem = findFieldItem(mappingTree, 'SMS');
      expect(smsItem).toBeDefined();
      expect(smsItem!.children).toHaveLength(0);
      expect(findFieldItem(mappingTree, 'Email')).toBeUndefined();

      const xslt = serialize(mappingTree);
      expect(xslt).not.toMatch(/subject/);
    });

    it('should keep subject and its mapping when re-selecting Email', () => {
      const { mappingTree, wrapperNode, abstractWrapper } = createSetup();
      const emailItem = selectEmailWithMappedSubject(mappingTree, wrapperNode, abstractWrapper);
      const subjectItem = emailItem.children[0];

      wrapperNode.mapping = emailItem;
      substitute(wrapperNode, abstractWrapper, 'ns0:Email');

      expect(findFieldItem(mappingTree, 'Email')).toBe(emailItem);
      expect(emailItem.children).toEqual([subjectItem]);
      expect(subjectItem.children[0]).toBeInstanceOf(ValueOfSelector);
    });

    it('should keep the SMS FieldItem through the stale-mapping reconcile when Email was not user-created', () => {
      const { targetDoc, mappingTree, wrapperNode, abstractWrapper } = createSetup();
      const emailItem = selectEmailWithMappedSubject(mappingTree, wrapperNode, abstractWrapper);
      emailItem.isUserCreated = false;

      wrapperNode.mapping = emailItem;
      substitute(wrapperNode, abstractWrapper, 'ns0:SMS');
      MappingService.removeStaleMappingsForDocument(mappingTree, targetDoc);

      const smsItem = findFieldItem(mappingTree, 'SMS');
      expect(smsItem).toBeDefined();
      expect(smsItem!.isUserCreated).toBe(true);
      expect(smsItem!.children).toHaveLength(0);
    });

    it('should keep the enclosing xsl:if and discard only the outgoing member’s children', () => {
      const { mappingTree, wrapperNode, abstractWrapper } = createSetup();
      const ifItem = new IfItem(mappingTree);
      mappingTree.children.push(ifItem);
      const emailField = abstractWrapper.fields.find((f) => f.name === 'Email')!;
      const emailItem = new FieldItem(ifItem, emailField);
      ifItem.children.push(emailItem);
      addMappedChild(emailItem, 'subject');

      FieldOverrideService.applyFieldSubstitution(abstractWrapper, 'ns0:Email', NAMESPACE_MAP);
      wrapperNode.mapping = emailItem;
      substitute(wrapperNode, abstractWrapper, 'ns0:SMS');

      expect(mappingTree.children).toEqual([ifItem]);
      expect(ifItem.children).toHaveLength(1);
      const smsItem = ifItem.children[0] as FieldItem;
      expect(smsItem.field.name).toBe('SMS');
      expect(smsItem.parent).toBe(ifItem);
      expect(smsItem.children).toHaveLength(0);
    });

    it('should not emit subject inside SMS after changing the choice from Email to SMS', () => {
      const { mappingTree, docNode, targetDoc } = createSetup();
      const { choiceWrapper, choiceNode, abstractIndex } = createChoiceSetup(targetDoc, docNode);

      selectChoice(choiceNode, choiceWrapper, { memberIndex: abstractIndex, substituteQName: 'ns0:Email' });
      const emailItem = findFieldItem(mappingTree, 'Email')!;
      addMappedChild(emailItem, 'subject');
      expect(serialize(mappingTree)).toMatch(/subject/);

      choiceNode.mapping = emailItem;
      selectChoice(choiceNode, choiceWrapper, { memberIndex: abstractIndex, substituteQName: 'ns0:SMS' });

      expect(findFieldItem(mappingTree, 'Email')).toBeUndefined();
      const smsItem = findFieldItem(mappingTree, 'SMS');
      expect(smsItem).toBeDefined();
      expect(smsItem!.children).toHaveLength(0);
      expect(serialize(mappingTree)).not.toMatch(/subject/);
    });

    it('should not emit url inside Email after changing the choice from Webhook to Email', () => {
      const { mappingTree, docNode, targetDoc } = createSetup();
      const { choiceWrapper, choiceNode, abstractIndex, webhookIndex } = createChoiceSetup(targetDoc, docNode);

      selectChoice(choiceNode, choiceWrapper, { memberIndex: webhookIndex });
      const webhookItem = findFieldItem(mappingTree, 'Webhook')!;
      addMappedChild(webhookItem, 'url');
      expect(serialize(mappingTree)).toMatch(/url/);

      choiceNode.mapping = webhookItem;
      selectChoice(choiceNode, choiceWrapper, { memberIndex: abstractIndex, substituteQName: 'ns0:Email' });

      expect(findFieldItem(mappingTree, 'Webhook')).toBeUndefined();
      const emailItem = findFieldItem(mappingTree, 'Email');
      expect(emailItem).toBeDefined();
      expect(emailItem!.children).toHaveLength(0);
      expect(serialize(mappingTree)).not.toMatch(/url/);
    });
  });
});

function serialize(mappingTree: MappingTree): string {
  return MappingSerializerService.serialize(mappingTree, TestUtil.createParameterMap());
}

function createChoiceSetup(targetDoc: IDocument, docNode: TargetDocumentNodeData) {
  const choiceWrapper = findChoiceWrapper(targetDoc);
  const choiceNode = new TargetFieldNodeData(docNode, choiceWrapper);
  const webhookIndex = choiceWrapper.fields.findIndex((f) => f.name === 'Webhook');
  const abstractIndex = choiceWrapper.fields.findIndex((f) => f.wrapperKind === 'abstract');
  return { choiceWrapper, choiceNode, webhookIndex, abstractIndex };
}

/** Same selection shape the choice menu sends: an abstract member is offered as its concrete substitutes. */
function selectChoice(choiceNode: TargetFieldNodeData, choiceWrapper: IField, selection: IMemberSelection) {
  ChoiceFieldService.dispatchChoiceSelection(choiceNode, choiceWrapper, selection, NAMESPACE_MAP, true);
}

function createSetup() {
  const targetDoc = createTargetDoc();
  const mappingTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  const docNode = new TargetDocumentNodeData(targetDoc, mappingTree);
  const abstractWrapper = findAbstractWrapper(targetDoc);
  const wrapperNode = new TargetFieldNodeData(docNode, abstractWrapper);
  return { targetDoc, mappingTree, docNode, abstractWrapper, wrapperNode };
}

function addMappedChild(parentItem: FieldItem, childName: string): FieldItem {
  const childField = DocumentUtilService.resolveTypeFragment(parentItem.field).fields.find((f) => f.name === childName);
  const childItem = new FieldItem(parentItem, childField!);
  childItem.children.push(new ValueOfSelector(childItem));
  parentItem.children.push(childItem);
  return childItem;
}

function selectEmailWithMappedSubject(
  mappingTree: MappingTree,
  wrapperNode: TargetFieldNodeData,
  abstractWrapper: IField,
): FieldItem {
  substitute(wrapperNode, abstractWrapper, 'ns0:Email');
  const emailItem = findFieldItem(mappingTree, 'Email')!;
  addMappedChild(emailItem, 'subject');
  return emailItem;
}

function findFieldItem(root: MappingTree | FieldItem, name: string): FieldItem | undefined {
  for (const child of root.children) {
    if (child instanceof FieldItem) {
      if (child.field.name === name) return child;
      const found = findFieldItem(child, name);
      if (found) return found;
    }
  }
  return undefined;
}
