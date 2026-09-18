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
import { FieldItem, MappingTree, ValueOfSelector } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData, TargetFieldNodeData } from '../../models/datamapper/visualization';
import { getChoiceWithAbstractXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document/document-util.service';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { AbstractFieldService } from './abstract-field.service';

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

function findAbstractWrapper(targetDoc: IDocument): IField {
  const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
  const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice' && f.maxOccurs === 1);
  const abstractWrapper = choiceWrapper!.fields.find((f) => f.wrapperKind === 'abstract');
  return abstractWrapper!;
}

function substitute(nodeData: TargetFieldNodeData, wrapper: IField, qname: string) {
  AbstractFieldService.applyAbstractSubstitution(nodeData, wrapper, qname, {}, wrapper, NAMESPACE_MAP, true);
}

/**
 * Pins what a selection move does today, ahead of the wrapper-selection refactoring. Changing a
 * target wrapper's selected member re-parents the outgoing member's mapped children onto the
 * incoming one with no compatibility check, so the serialized XSLT can carry an element the
 * selected member does not declare.
 *
 * The control tests are permanent: they assert the fixture is capable of showing that at all —
 * `Email_t` declaring `subject` where `SMS_t` does not — which is what makes the third test's
 * result meaningful rather than merely green. The `defect` block records the broken behaviour on
 * purpose and **inverts when the re-parent is fixed**, and the issue that fixes it enumerates this
 * file, so a red test here is the planned outcome rather than a regression.
 */
describe('selection move re-parents the outgoing member’s children', () => {
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
      const targetDoc = createTargetDoc();
      const mappingTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(targetDoc, mappingTree);
      const abstractWrapper = findAbstractWrapper(targetDoc);
      const wrapperNode = new TargetFieldNodeData(docNode, abstractWrapper);

      substitute(wrapperNode, abstractWrapper, 'ns0:Email');

      const emailItem = findFieldItem(mappingTree, 'Email');
      expect(emailItem).toBeDefined();

      const subjectField = DocumentUtilService.resolveTypeFragment(emailItem!.field).fields.find(
        (f) => f.name === 'subject',
      );
      const subjectItem = new FieldItem(emailItem!, subjectField!);
      subjectItem.children.push(new ValueOfSelector(subjectItem));
      emailItem!.children.push(subjectItem);

      expect(emailItem!.children).toHaveLength(1);
      expect((emailItem!.children[0] as FieldItem).field.name).toBe('subject');
    });
  });

  describe('defect — inverts when DecoupleSelection: S6 lands', () => {
    it('should emit subject inside SMS after substituting Email with SMS', () => {
      const targetDoc = createTargetDoc();
      const mappingTree = new MappingTree(
        targetDoc.documentType,
        targetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(targetDoc, mappingTree);
      const abstractWrapper = findAbstractWrapper(targetDoc);
      const wrapperNode = new TargetFieldNodeData(docNode, abstractWrapper);

      substitute(wrapperNode, abstractWrapper, 'ns0:Email');
      const emailItem = findFieldItem(mappingTree, 'Email')!;
      const subjectField = DocumentUtilService.resolveTypeFragment(emailItem.field).fields.find(
        (f) => f.name === 'subject',
      );
      const subjectItem = new FieldItem(emailItem, subjectField!);
      subjectItem.children.push(new ValueOfSelector(subjectItem));
      emailItem.children.push(subjectItem);

      const before = MappingSerializerService.serialize(mappingTree, TestUtil.createParameterMap());
      expect(before).toMatch(/<[^>]*Email[^>]*>\s*<[^>]*subject/);
      expect(before).not.toMatch(/<[^>]*SMS[^>]*>\s*<[^>]*subject/);

      wrapperNode.mapping = emailItem;
      substitute(wrapperNode, abstractWrapper, 'ns0:SMS');

      const xslt = MappingSerializerService.serialize(mappingTree, TestUtil.createParameterMap());

      expect(xslt).toMatch(/<[^>]*SMS[^>]*>\s*<[^>]*subject/);
      expect(xslt).not.toMatch(/<[^>]*Email[^>]*>\s*<[^>]*subject/);
    });
  });
});

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
