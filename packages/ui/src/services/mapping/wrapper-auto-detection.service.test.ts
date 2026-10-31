import {
  BaseField,
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
  RootElementOption,
} from '../../models/datamapper/document';
import {
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  IfItem,
  MappingTree,
  ValueOfSelector,
} from '../../models/datamapper/mapping';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import {
  getChoiceWithAbstractXsd,
  getFieldSubstitutionXsd,
  getNonAbstractSubstitutionXsd,
  getSchemaTestXsd,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { WrapperAutoDetectionService } from './wrapper-auto-detection.service';

const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';
const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';
const NS_SCHEMA_TEST = 'http://www.example.com/test';
const NS_NONABSTRACT = 'http://www.example.com/NONABSTRACT';

const NOTIFICATION_ROOT: RootElementOption = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };

function createTargetDoc(
  schemaContent: string,
  schemaFileName: string,
  options?: {
    definition?: DocumentDefinition;
    rootElementChoice?: RootElementOption;
    namespaceMap?: Record<string, string>;
  },
): IDocument {
  const def =
    options?.definition ??
    new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      {
        [schemaFileName]: schemaContent,
      },
      options?.rootElementChoice,
    );
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(def, options?.namespaceMap);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
  }
  return result.document;
}

/** Detection is part of {@link MappingSerializerService.deserialize}, so this just deserializes. */
function deserializeAndAutoDetect(xslt: string, targetDocument: IDocument): MappingTree {
  const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
  const sourceParameterMap = new Map<string, IDocument>();
  MappingSerializerService.deserialize(xslt, targetDocument, mappingTree, sourceParameterMap);
  return mappingTree;
}

function makeXslt(namespaces: Record<string, string>, body: string): string {
  const nsAttrs = Object.entries(namespaces)
    .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
    .join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="${NS_XSL}" ${nsAttrs}>
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
${body}
  </xsl:template>
</xsl:stylesheet>`;
}

describe('WrapperAutoDetectionService', () => {
  describe('abstract field auto-detection', () => {
    it('should set selectedMemberQName when concrete element at abstract position has maxOccurs=1', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <ns0:Nickname>test</ns0:Nickname>
    </ns0:Zoo>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);
      const abstractLabel = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractLabel',
      );
      expect(abstractLabel).toBeDefined();
      expect(abstractLabel!.selectedMemberQName).toBeDefined();
      expect(abstractLabel!.selectedMemberQName!.getLocalPart()).toBe('Nickname');

      const zooFieldItem = mappingTree.children[0] as FieldItem;
      const nicknameFieldItem = zooFieldItem.children[0] as FieldItem;
      expect(nicknameFieldItem.isUserCreated).toBe(true);

      const subs = targetDoc.definition.fieldSubstitutions;
      expect(subs).toBeDefined();
      expect(subs!.some((s) => s.name.includes('Nickname'))).toBe(true);
    });

    it('should NOT auto-detect when abstract wrapper has maxOccurs > 1', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <ns0:Dog><ns0:name>Rex</ns0:name><ns0:breed>Lab</ns0:breed></ns0:Dog>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const abstractAnimal = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractAnimal',
      );
      expect(abstractAnimal).toBeDefined();
      expect(abstractAnimal!.maxOccurs).not.toBe(1);
      expect(abstractAnimal!.selectedMemberQName).toBeUndefined();
    });

    it('should NOT auto-detect when element is inside xsl:if', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <xsl:if test="true()">
        <ns0:Nickname>test</ns0:Nickname>
      </xsl:if>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const abstractLabel = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractLabel',
      );
      expect(abstractLabel!.selectedMemberQName).toBeUndefined();
    });

    it('should NOT auto-detect when element is inside xsl:choose/xsl:when', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <xsl:choose>
        <xsl:when test="true()">
          <ns0:Nickname>test</ns0:Nickname>
        </xsl:when>
      </xsl:choose>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const abstractLabel = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractLabel',
      );
      expect(abstractLabel!.selectedMemberQName).toBeUndefined();
    });

    it('should skip when existing .kaoto metadata has substitution entry', () => {
      const nsMap = { ns0: NS_SUBSTITUTION };
      const def = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        undefined,
        undefined,
        undefined,
        [
          {
            schemaPath: '/ns0:Zoo/{abstract:1}',
            name: 'ns0:XsStringTag',
            originalName: 'ns0:AbstractLabel',
          },
        ],
      );
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd', {
        definition: def,
        namespaceMap: nsMap,
      });
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <ns0:Nickname>test</ns0:Nickname>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const abstractLabel = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractLabel',
      );
      expect(abstractLabel!.selectedMemberQName).toBeDefined();
      expect(abstractLabel!.selectedMemberQName!.getLocalPart()).toBe('XsStringTag');
    });

    it('should auto-detect direct substitution (InlineIntCount -> AbstractCount)', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <ns0:InlineIntCount>5</ns0:InlineIntCount>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const abstractCount = targetDoc.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractCount',
      );
      expect(abstractCount).toBeDefined();
      expect(abstractCount!.selectedMemberQName).toBeDefined();
      expect(abstractCount!.selectedMemberQName!.getLocalPart()).toBe('InlineIntCount');
    });
  });

  describe('choice field auto-detection', () => {
    it('should set selectedMemberIndex when element uniquely identifies a choice branch', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:Short>
        <ns0:id>123</ns0:id>
        <ns0:Webhook><ns0:url>http://example.com</ns0:url></ns0:Webhook>
      </ns0:Short>
    </ns0:Notification>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      expect(choiceWrapper!.selectedMemberIndex).toBeDefined();

      const webhookMember = choiceWrapper!.fields.find((f) => f.name === 'Webhook');
      expect(choiceWrapper!.selectedMemberIndex).toBe(choiceWrapper!.fields.indexOf(webhookMember!));

      const notifFieldItem = mappingTree.children[0] as FieldItem;
      const shortFieldItem = notifFieldItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'Short',
      ) as FieldItem;
      const webhookFieldItem = shortFieldItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'Webhook',
      ) as FieldItem;
      expect(webhookFieldItem.isUserCreated).toBe(true);

      const selections = targetDoc.definition.choiceSelections;
      expect(selections).toBeDefined();
      expect(selections!.length).toBeGreaterThanOrEqual(1);
    });

    it('should NOT auto-detect when element is inside xsl:if', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:Short>
        <xsl:if test="true()">
          <ns0:Webhook><ns0:url>http://example.com</ns0:url></ns0:Webhook>
        </xsl:if>
      </ns0:Short>
    </ns0:Notification>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper!.selectedMemberIndex).toBeUndefined();
    });
  });

  describe('nested choice + abstract auto-detection', () => {
    it('should auto-detect both choice and abstract selections for Email inside choice>abstract', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:Short>
        <ns0:id>123</ns0:id>
        <ns0:Email><ns0:content>hello</ns0:content><ns0:subject>test</ns0:subject></ns0:Email>
      </ns0:Short>
    </ns0:Notification>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);

      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      expect(choiceWrapper!.selectedMemberIndex).toBeDefined();

      const abstractWrapper = choiceWrapper!.fields.find((f) => f.wrapperKind === 'abstract');
      expect(abstractWrapper).toBeDefined();
      expect(abstractWrapper!.selectedMemberQName).toBeDefined();
      expect(abstractWrapper!.selectedMemberQName!.getLocalPart()).toBe('Email');

      expect(choiceWrapper!.selectedMemberIndex).toBe(choiceWrapper!.fields.indexOf(abstractWrapper!));
    });
  });

  describe('non-abstract substitution auto-detection (Phase A)', () => {
    it('should apply substitution when substitute element appears where head is expected', () => {
      const targetDoc = createTargetDoc(getNonAbstractSubstitutionXsd(), 'NonAbstractSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_NONABSTRACT },
        `    <ns0:Root>
      <ns0:SubElement><ns0:base>val</ns0:base><ns0:extra>x</ns0:extra></ns0:SubElement>
    </ns0:Root>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);

      const headField = targetDoc.fields[0].fields.find(
        (f) => f.originalField?.name === 'HeadElement' || f.name === 'SubElement',
      );
      expect(headField).toBeDefined();
      expect(headField!.name).toBe('SubElement');

      const subs = targetDoc.definition.fieldSubstitutions;
      expect(subs).toBeDefined();
      expect(subs!.some((s) => s.name.includes('SubElement'))).toBe(true);

      const rootItem = mappingTree.children[0] as FieldItem;
      const subItem = rootItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'SubElement',
      ) as FieldItem;
      expect(subItem).toBeDefined();
      expect(subItem.isUserCreated).toBe(true);
    });
  });

  describe('empty element marking', () => {
    it('should mark FieldItems with no children as isUserCreated', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:id/>
    </ns0:Notification>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);
      const notifItem = mappingTree.children[0] as FieldItem;
      const idItem = notifItem.children.find((c) => c instanceof FieldItem && c.field.name === 'id') as FieldItem;
      expect(idItem).toBeDefined();
      expect(idItem.isUserCreated).toBe(true);
    });

    it('should NOT mark FieldItems that have children as isUserCreated', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:id><xsl:value-of select="'123'"/></ns0:id>
    </ns0:Notification>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);
      const notifItem = mappingTree.children[0] as FieldItem;
      const idItem = notifItem.children.find((c) => c instanceof FieldItem && c.field.name === 'id') as FieldItem;
      expect(idItem).toBeDefined();
      expect(idItem.isUserCreated).toBe(false);
    });
  });

  describe('condition checks', () => {
    it('hasConditionalWrapper should return false for FieldItem not in conditional', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:id>123</ns0:id>
    </ns0:Notification>`,
      );

      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const sourceParameterMap = new Map<string, IDocument>();
      MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap);

      const notifItem = mappingTree.children[0] as FieldItem;
      const idItem = notifItem.children.find((c) => c instanceof FieldItem && c.field.name === 'id') as FieldItem;
      expect(WrapperAutoDetectionService.hasConditionalWrapper(idItem)).toBe(false);
    });

    it('hasConditionalWrapper should return true for FieldItem inside xsl:if', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <xsl:if test="true()">
        <ns0:id>123</ns0:id>
      </xsl:if>
    </ns0:Notification>`,
      );

      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const sourceParameterMap = new Map<string, IDocument>();
      MappingSerializerService.deserialize(xslt, targetDoc, mappingTree, sourceParameterMap);

      const notifItem = mappingTree.children[0] as FieldItem;
      const ifItem = notifItem.children[0];
      const idItem = ifItem.children.find((c) => c instanceof FieldItem && c.field.name === 'id') as FieldItem;
      expect(idItem).toBeDefined();
      expect(WrapperAutoDetectionService.hasConditionalWrapper(idItem)).toBe(true);
    });

    it('isUniqueInWrapper should return true for unique element in wrapper', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      const webhook = choiceWrapper!.fields.find((f) => f.name === 'Webhook');
      expect(webhook).toBeDefined();
      expect(WrapperAutoDetectionService.isUniqueInWrapper(webhook!, choiceWrapper!)).toBe(true);
    });
  });

  describe('choice auto-detection with SchemaTest.xsd', () => {
    it('should auto-detect choice selection from SchemaTest.xsd', () => {
      const targetDoc = createTargetDoc(getSchemaTestXsd(), 'SchemaTest.xsd');
      const xslt = makeXslt(
        { ns0: NS_SCHEMA_TEST },
        `    <ns0:Root>
      <ns0:person>
        <ns0:fax>123-456</ns0:fax>
      </ns0:person>
    </ns0:Root>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);

      const personField = targetDoc.fields[0].fields.find((f) => f.name === 'person');
      expect(personField).toBeDefined();
      const choiceWrapper = personField!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      expect(choiceWrapper!.maxOccurs).toBe(1);
      const faxMember = choiceWrapper!.fields.find((f) => f.name === 'fax');
      expect(faxMember).toBeDefined();
      expect(choiceWrapper!.selectedMemberIndex).toBe(choiceWrapper!.fields.indexOf(faxMember!));
    });
  });

  describe('post-deserialize integration', () => {
    it('should register detected prefixes on the mapping tree namespace map, not a detached copy', () => {
      const targetDoc = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      // The XSLT declares the substitution namespace under `custom`, so detection has to reuse
      // that prefix from the map restoreNamespaces rebuilt — the map serialization also uses.
      const xslt = makeXslt(
        { custom: NS_SUBSTITUTION },
        `    <custom:Zoo>
      <custom:Nickname>test</custom:Nickname>
    </custom:Zoo>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);

      expect(mappingTree.namespaceMap['custom']).toBe(NS_SUBSTITUTION);
      const substitutions = targetDoc.definition.fieldSubstitutions;
      expect(substitutions).toBeDefined();
      expect(substitutions!.length).toBeGreaterThanOrEqual(1);
      expect(substitutions![0].schemaPath).toContain('custom:');
    });
  });

  describe('choice metadata precedence', () => {
    it('should skip auto-detection when existing .kaoto metadata has choiceSelections entry', () => {
      const nsMap = { ns0: NS_CHOICE_ABSTRACT };
      const def = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'ChoiceWithAbstract.xsd': getChoiceWithAbstractXsd() },
        NOTIFICATION_ROOT,
        undefined,
        [{ schemaPath: '/ns0:Notification/ns0:Short/{choice:0}', selectedMemberIndex: 0 }],
      );
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        definition: def,
        namespaceMap: nsMap,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:Short>
        <ns0:id>123</ns0:id>
        <ns0:Webhook><ns0:url>http://example.com</ns0:url></ns0:Webhook>
      </ns0:Short>
    </ns0:Notification>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      expect(choiceWrapper!.selectedMemberIndex).toBe(0);
    });
  });

  describe('choice with xsl:choose wrapping', () => {
    it('should NOT auto-detect when element is inside xsl:choose/xsl:when', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const xslt = makeXslt(
        { ns0: NS_CHOICE_ABSTRACT },
        `    <ns0:Notification>
      <ns0:Short>
        <xsl:choose>
          <xsl:when test="true()">
            <ns0:Webhook><ns0:url>http://example.com</ns0:url></ns0:Webhook>
          </xsl:when>
        </xsl:choose>
      </ns0:Short>
    </ns0:Notification>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short');
      const choiceWrapper = short!.fields.find((f) => f.wrapperKind === 'choice');
      expect(choiceWrapper).toBeDefined();
      expect(choiceWrapper!.selectedMemberIndex).toBeUndefined();
    });
  });

  describe('ambiguous element detection', () => {
    it('isUniqueInWrapper should return false when element name appears in multiple wrapper children', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short')!;
      const choiceWrapper = short.fields.find((f) => f.wrapperKind === 'choice')!;
      const webhook = choiceWrapper.fields.find((f) => f.name === 'Webhook')!;
      const duplicate = new BaseField(choiceWrapper, targetDoc, 'Webhook');
      duplicate.namespaceURI = webhook.namespaceURI;
      choiceWrapper.fields.push(duplicate);

      expect(WrapperAutoDetectionService.isUniqueInWrapper(webhook, choiceWrapper)).toBe(false);

      choiceWrapper.fields.pop();
    });
  });

  describe('non-abstract substitution edge cases', () => {
    it('should NOT apply substitution when head field has maxOccurs > 1', () => {
      const schema = getNonAbstractSubstitutionXsd().replace(
        '<xs:element ref="HeadElement"/>',
        '<xs:element ref="HeadElement" maxOccurs="unbounded"/>',
      );
      const targetDoc = createTargetDoc(schema, 'NonAbstractUnbounded.xsd');
      const xslt = makeXslt(
        { ns0: NS_NONABSTRACT },
        `    <ns0:Root>
      <ns0:SubElement><ns0:base>val</ns0:base><ns0:extra>x</ns0:extra></ns0:SubElement>
    </ns0:Root>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc);

      const headField = targetDoc.fields[0].fields.find((f) => f.name === 'HeadElement');
      expect(headField).toBeDefined();
      expect(headField!.typeOverride).not.toBe(FieldOverrideVariant.SUBSTITUTION);
    });

    it('should substitute field but NOT persist metadata when inside xsl:if', () => {
      const targetDoc = createTargetDoc(getNonAbstractSubstitutionXsd(), 'NonAbstractConditional.xsd');
      const xslt = makeXslt(
        { ns0: NS_NONABSTRACT },
        `    <ns0:Root>
      <xsl:if test="true()">
        <ns0:SubElement><ns0:base>val</ns0:base><ns0:extra>x</ns0:extra></ns0:SubElement>
      </xsl:if>
    </ns0:Root>`,
      );

      const mappingTree = deserializeAndAutoDetect(xslt, targetDoc);

      const substitutedField = targetDoc.fields[0].fields.find((f) => f.name === 'SubElement');
      expect(substitutedField).toBeDefined();
      expect(substitutedField!.typeOverride).toBe(FieldOverrideVariant.SUBSTITUTION);

      expect(targetDoc.definition.fieldSubstitutions ?? []).toHaveLength(0);

      const rootItem = mappingTree.children[0] as FieldItem;
      const ifItem = rootItem.children[0];
      const subItem = ifItem.children.find((c) => c instanceof FieldItem && c.field.name === 'SubElement') as FieldItem;
      expect(subItem).toBeDefined();
      expect(subItem.isUserCreated).toBe(true);
    });
  });

  describe('persistence round-trip', () => {
    it('should preserve auto-detected abstract selection through metadata round-trip', () => {
      const targetDoc1 = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd');
      const xslt = makeXslt(
        { ns0: NS_SUBSTITUTION },
        `    <ns0:Zoo>
      <ns0:Nickname>test</ns0:Nickname>
    </ns0:Zoo>`,
      );

      deserializeAndAutoDetect(xslt, targetDoc1);

      const subs1 = targetDoc1.definition.fieldSubstitutions;
      expect(subs1).toBeDefined();
      expect(subs1!.length).toBeGreaterThanOrEqual(1);

      const def2 = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        undefined,
        undefined,
        undefined,
        [...subs1!],
      );
      const nsMap2 = { ns0: NS_SUBSTITUTION };
      const targetDoc2 = createTargetDoc(getFieldSubstitutionXsd(), 'FieldSubstitution.xsd', {
        definition: def2,
        namespaceMap: nsMap2,
      });

      deserializeAndAutoDetect(xslt, targetDoc2);

      const abstractLabel2 = targetDoc2.fields[0].fields.find(
        (f) => f.wrapperKind === 'abstract' && f.name === 'AbstractLabel',
      );
      expect(abstractLabel2).toBeDefined();
      expect(abstractLabel2!.selectedMemberQName).toBeDefined();
      expect(abstractLabel2!.selectedMemberQName!.getLocalPart()).toBe('Nickname');
    });
  });

  describe('FieldItem.clone() preserves isUserCreated', () => {
    it('should copy isUserCreated=true via clone()', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short')!;
      const field = short.fields.find((f) => f.name === 'id')!;
      const fi = new FieldItem(mappingTree, field);
      fi.isUserCreated = true;
      const cloned = fi.clone();
      expect((cloned as FieldItem).isUserCreated).toBe(true);
    });

    it('should copy isUserCreated=false (default) via clone()', () => {
      const targetDoc = createTargetDoc(getChoiceWithAbstractXsd(), 'ChoiceWithAbstract.xsd', {
        rootElementChoice: NOTIFICATION_ROOT,
      });
      const mappingTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const short = targetDoc.fields[0].fields.find((f) => f.name === 'Short')!;
      const field = short.fields.find((f) => f.name === 'id')!;
      const fi = new FieldItem(mappingTree, field);
      const cloned = fi.clone();
      expect((cloned as FieldItem).isUserCreated).toBe(false);
    });
  });

  describe('optional guard shape rules', () => {
    const NOTE_PATH = '/ns0:ShipOrder/Item/Note';
    let tree: MappingTree;
    let targetField: IField;
    let requiredTargetField: IField;

    beforeEach(() => {
      tree = new MappingTree(DocumentType.TARGET_BODY, 'ShipOrder', DocumentDefinitionType.XML_SCHEMA);
      const targetDoc = TestUtil.createTargetOrderDoc();
      targetField = targetDoc.fields[0].fields[3].fields[1]; // Item/Note — minOccurs="0" in the schema
      requiredTargetField = targetDoc.fields[0].fields[1];
    });

    function buildSimpleGuard(expression: string, field: IField = targetField): IfItem {
      const ifItem = new IfItem(tree);
      ifItem.expression = expression;
      const fieldItem = new FieldItem(ifItem, field);
      const selector = new ValueOfSelector(fieldItem);
      selector.expression = expression;
      fieldItem.children.push(selector);
      ifItem.children.push(fieldItem);
      return ifItem;
    }

    describe('shouldWrapWithOptionalGuard()', () => {
      let sourceDoc: IDocument;
      let sourceField: IField;
      let fieldItem: FieldItem;

      beforeEach(() => {
        sourceDoc = TestUtil.createSourceOrderDoc();
        sourceField = sourceDoc.fields[0].fields[3].fields[1]; // Item/Note
        fieldItem = new FieldItem(tree, targetField);
        tree.children.push(fieldItem);
      });

      function mapFrom(expression: string, item: FieldItem = fieldItem) {
        const selector = new ValueOfSelector(item);
        selector.expression = expression;
        item.children.push(selector);
      }

      it('should return true for a sole selector holding a bare path', () => {
        mapFrom(NOTE_PATH);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(true);
      });

      it('should return true for a CopyOfType.CONTAINER_NODE selector despite its /node() suffix', () => {
        const selector = new CopyOfSelector(fieldItem, CopyOfType.CONTAINER_NODE);
        selector.expression = `${NOTE_PATH}/node()`;
        fieldItem.children.push(selector);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(true);
      });

      it('should return false when the selector already carries another source', () => {
        mapFrom(`/ns0:ShipOrder/Item/Title, ${NOTE_PATH}`);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(false);
      });

      it('should return false when the selector is not a bare path', () => {
        mapFrom(`concat(${NOTE_PATH}, "!")`);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(false);
      });

      it('should return false when the field is already wrapped by an IfItem', () => {
        mapFrom(NOTE_PATH);
        fieldItem.parent = new IfItem(tree);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(false);
      });

      it('should return false when the target field is required', () => {
        const requiredItem = new FieldItem(tree, requiredTargetField);
        mapFrom(NOTE_PATH, requiredItem);
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(requiredItem, sourceField, false)).toBe(false);
      });

      it('should return false when the source field is required', () => {
        const requiredSource = sourceDoc.fields[0].fields[1];
        mapFrom('/ns0:ShipOrder/ns0:OrderPerson');
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, requiredSource, false)).toBe(false);
      });

      it('should return false for a PrimitiveDocument source, even though its minOccurs defaults to 0', () => {
        mapFrom(NOTE_PATH);
        const primitiveDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'Body'),
        );
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, primitiveDoc, false)).toBe(false);
      });

      it('should return false when the field has no children yet', () => {
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(false);
      });

      it('should return true for recursive children on a previously unmapped field', () => {
        fieldItem.children.push(new FieldItem(fieldItem, targetField));
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, false)).toBe(true);
      });

      it('should return false for recursive children when the container already carried a mapping', () => {
        fieldItem.children.push(new FieldItem(fieldItem, targetField));
        expect(WrapperAutoDetectionService.shouldWrapWithOptionalGuard(fieldItem, sourceField, true)).toBe(false);
      });
    });

    describe('getHiddenGuardSelector()', () => {
      function mapField(field: IField, expression: string): FieldItem {
        const fieldItem = new FieldItem(tree, field);
        const selector = new ValueOfSelector(fieldItem);
        selector.expression = expression;
        fieldItem.children.push(selector);
        return fieldItem;
      }

      it('should return the sole selector of an optional field mapped by a bare path', () => {
        const fieldItem = mapField(targetField, NOTE_PATH);
        expect(WrapperAutoDetectionService.getHiddenGuardSelector(fieldItem)).toBe(fieldItem.children[0]);
      });

      it('should return undefined for a field that is already under an IfItem', () => {
        const ifItem = buildSimpleGuard(NOTE_PATH);
        expect(WrapperAutoDetectionService.getHiddenGuardSelector(ifItem.children[0] as FieldItem)).toBeUndefined();
      });

      it('should return undefined for a required target field', () => {
        const fieldItem = mapField(requiredTargetField, '/ns0:ShipOrder/ns0:OrderPerson');
        expect(WrapperAutoDetectionService.getHiddenGuardSelector(fieldItem)).toBeUndefined();
      });
    });

    describe('isOptionalSourceField()', () => {
      it('should follow the source schema and never treat a PrimitiveDocument as optional', () => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        const noteSource = sourceDoc.fields[0].fields[3].fields[1];
        const orderPersonSource = sourceDoc.fields[0].fields[1];
        const primitiveDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'Body'),
        );

        expect(WrapperAutoDetectionService.isOptionalSourceField(noteSource)).toBe(true);
        expect(WrapperAutoDetectionService.isOptionalSourceField(orderPersonSource)).toBe(false);
        expect(WrapperAutoDetectionService.isOptionalSourceField(primitiveDoc)).toBe(false);
      });
    });

    describe('matchSimpleOptionalGuard()', () => {
      it('should match a simple value-of guard on an optional field', () => {
        const ifItem = buildSimpleGuard(NOTE_PATH);
        const matched = WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem);
        expect(matched).toBe(ifItem.children[0]);
      });

      it('should strip the CopyOfType.CONTAINER_NODE /node() suffix before comparing', () => {
        const ifItem = new IfItem(tree);
        ifItem.expression = NOTE_PATH;
        const fieldItem = new FieldItem(ifItem, targetField);
        const selector = new CopyOfSelector(fieldItem, CopyOfType.CONTAINER_NODE);
        selector.expression = `${NOTE_PATH}/node()`;
        fieldItem.children.push(selector);
        ifItem.children.push(fieldItem);

        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBe(fieldItem);
      });

      it('should return undefined when the IfItem does not have exactly one child', () => {
        const ifItem = buildSimpleGuard(NOTE_PATH);
        ifItem.children.push(new FieldItem(ifItem, targetField));
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should return undefined when the sole child is not a FieldItem', () => {
        const ifItem = new IfItem(tree);
        ifItem.expression = NOTE_PATH;
        ifItem.children.push(new ValueOfSelector(ifItem));
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should return undefined when the target field is required', () => {
        const ifItem = buildSimpleGuard('/ns0:ShipOrder/ns0:OrderPerson', requiredTargetField);
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should return undefined when the test expression is not a simple path', () => {
        const ifItem = buildSimpleGuard(`${NOTE_PATH} != ''`);
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should return undefined when the field has recursive children instead of a sole selector', () => {
        const ifItem = new IfItem(tree);
        ifItem.expression = NOTE_PATH;
        const fieldItem = new FieldItem(ifItem, targetField);
        fieldItem.children.push(new FieldItem(fieldItem, targetField));
        ifItem.children.push(fieldItem);
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should return undefined when the selector expression does not match the test expression', () => {
        const ifItem = new IfItem(tree);
        ifItem.expression = NOTE_PATH;
        const fieldItem = new FieldItem(ifItem, targetField);
        const selector = new ValueOfSelector(fieldItem);
        selector.expression = `concat(${NOTE_PATH}, "!")`;
        fieldItem.children.push(selector);
        ifItem.children.push(fieldItem);
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
      });

      it('should match a candidate test without writing it to the IfItem', () => {
        const ifItem = buildSimpleGuard(NOTE_PATH);
        ifItem.expression = '/ns0:ShipOrder/Item/Title';

        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem)).toBeUndefined();
        expect(WrapperAutoDetectionService.matchSimpleOptionalGuard(ifItem, NOTE_PATH)).toBe(ifItem.children[0]);
        expect(ifItem.expression).toBe('/ns0:ShipOrder/Item/Title');
      });
    });
  });
});
