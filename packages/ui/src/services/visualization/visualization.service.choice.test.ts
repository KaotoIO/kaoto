import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
} from '../../models/datamapper/mapping';
import {
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { getTestDocumentXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentService } from '../document/document.service';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

describe('VisualizationService / choice fields', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let tree: MappingTree;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
  });

  function createMockChoiceField(members: { name: string }[], selectedMemberIndex?: number, maxOccurs?: 'unbounded') {
    const baseField = sourceDoc.fields[0];
    const memberFields = members.map((m) => ({
      ...baseField,
      name: m.name,
      displayName: m.name,
      fields: [],
    }));
    return {
      ...baseField,
      name: '__choice__',
      displayName: 'choice',
      wrapperKind: 'choice' as const,
      selectedMemberIndex,
      ...(maxOccurs === undefined ? {} : { maxOccurs }),
      fields: memberFields,
    } as unknown as typeof baseField;
  }

  describe('hasChildren', () => {
    it('should return true for choice field with members', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationService.hasChildren(choiceNode)).toBe(true);
    });

    it('should return false for choice field with empty members', () => {
      const choiceField = createMockChoiceField([]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationService.hasChildren(choiceNode)).toBe(false);
    });

    it('should return false for choice field with no members', () => {
      const choiceField = createMockChoiceField([]);
      choiceField.fields = [];
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationService.hasChildren(choiceNode)).toBe(false);
    });
  });

  describe('doGenerateNodeDataFromFields with choice fields', () => {
    it('should create ChoiceFieldNodeData for unselected source choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
    });

    it('should create TargetChoiceFieldNodeData for unselected target choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(TargetChoiceFieldNodeData);
    });

    it('should create ChoiceFieldNodeData with selected member for source choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(children[0].title).toEqual('email');
    });

    it('should create TargetChoiceFieldNodeData with selected member for target choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }], 1);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(TargetChoiceFieldNodeData);
      expect(children[0].title).toEqual('phone');
    });

    it('should still report isChoiceField for selected choice members', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(VisualizationUtilService.isChoiceField(children[0])).toBe(true);
    });

    it('should set choiceField reference for selected choice members', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const choiceNode = children[0] as ChoiceFieldNodeData;
      expect(choiceNode.choiceField).toBe(choiceField);
    });

    it('should not set choiceField reference for unselected choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const choiceNode = children[0] as ChoiceFieldNodeData;
      expect(choiceNode.choiceField).toBeUndefined();
    });

    it('should use choice field itself when selectedMemberIndex is out of bounds', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 99);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
    });
  });

  describe('generateNonDocumentNodeDataChildren for choice nodes', () => {
    it('should expand all choice members as children', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
      expect(children.length).toEqual(2);
    });

    it('should fall back to all members when selectedMemberIndex is out of bounds', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 99);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
      expect(children.length).toEqual(2);
      expect(children[0].title).toEqual('email');
      expect(children[1].title).toEqual('phone');
    });

    describe('XSD integration: choice wrapper expandability from real parsed schema', () => {
      let testDocumentChildren: ReturnType<typeof VisualizationService.generateNonDocumentNodeDataChildren>;

      beforeEach(() => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'testDocument.xsd': getTestDocumentXsd() },
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const docNode = new DocumentNodeData(result.document!);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const testDocumentNode = docChildren[0];
        testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
      });

      it('simple choice: members from elements and group ref are shown as children in order', () => {
        expect(testDocumentChildren[2].title).toEqual('ChoiceElement');
        const choiceElementChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[2]);
        expect(choiceElementChildren.length).toEqual(1);
        const choiceNode = choiceElementChildren[0] as ChoiceFieldNodeData;
        expect(choiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(choiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(choiceNode)).toEqual(
          '(Choice1 | Choice2 | Group1Element1 | +1 more)',
        );
        const members = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
        expect(members.length).toEqual(4);
        expect(members[0].title).toEqual('Choice1');
        expect(members[1].title).toEqual('Choice2');
        expect(members[2].title).toEqual('Group1Element1');
        expect(members[3].title).toEqual('Group1Element2');
      });

      it('sibling choices: two sibling xs:choice wrappers appear as distinct ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[3].title).toEqual('SiblingChoicesElement');
        const children = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[3]);
        expect(children.length).toEqual(2);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(children[0].title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(children[0] as ChoiceFieldNodeData)).toEqual('(SibA1 | SibA2)');
        expect(children[1]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(children[1].title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(children[1] as ChoiceFieldNodeData)).toEqual('(SibB1 | SibB2)');
        const firstMembers = VisualizationService.generateNonDocumentNodeDataChildren(
          children[0] as ChoiceFieldNodeData,
        );
        expect(firstMembers.length).toEqual(2);
        expect(firstMembers[0].title).toEqual('SibA1');
        expect(firstMembers[1].title).toEqual('SibA2');
        const secondMembers = VisualizationService.generateNonDocumentNodeDataChildren(
          children[1] as ChoiceFieldNodeData,
        );
        expect(secondMembers.length).toEqual(2);
        expect(secondMembers[0].title).toEqual('SibB1');
        expect(secondMembers[1].title).toEqual('SibB2');
      });

      it('direct nested choice: inner xs:choice appears as nested ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[4].title).toEqual('DirectNestedChoiceElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[4]);
        expect(outerChoiceChildren.length).toEqual(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toEqual('(Direct1 | choice)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers.length).toEqual(2);
        expect(outerMembers[0]).not.toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerMembers[0].title).toEqual('Direct1');
        const innerChoiceNode = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceNode)).toEqual('(NestedDirect1 | NestedDirect2)');
        const innerMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
        expect(innerMembers.length).toEqual(2);
        expect(innerMembers[0].title).toEqual('NestedDirect1');
        expect(innerMembers[1].title).toEqual('NestedDirect2');
      });

      it('multiple nested choices: outer title uses numbered suffixes without truncation', () => {
        expect(testDocumentChildren[5].title).toEqual('MultipleNestedChoicesElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[5]);
        expect(outerChoiceChildren.length).toEqual(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toEqual('(choice1 | choice2)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers.length).toEqual(2);
        const innerChoiceA = outerMembers[0] as ChoiceFieldNodeData;
        expect(innerChoiceA).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceA.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceA)).toEqual('(InnerA1 | InnerA2)');
        const innerChoiceB = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceB).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceB.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceB)).toEqual('(InnerB1 | InnerB2)');
        const innerAMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceA);
        expect(innerAMembers.length).toEqual(2);
        expect(innerAMembers[0].title).toEqual('InnerA1');
        expect(innerAMembers[1].title).toEqual('InnerA2');
        const innerBMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceB);
        expect(innerBMembers.length).toEqual(2);
        expect(innerBMembers[0].title).toEqual('InnerB1');
        expect(innerBMembers[1].title).toEqual('InnerB2');
      });

      it('too many nested choices: outer title is truncated with numbered suffixes', () => {
        expect(testDocumentChildren[6].title).toEqual('TooManyNestedChoicesElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[6]);
        expect(outerChoiceChildren.length).toEqual(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toEqual(
          '(choice1 | choice2 | choice3 | +2 more)',
        );
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers.length).toEqual(5);
        const innerChoices = outerMembers as ChoiceFieldNodeData[];
        expect(innerChoices[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[0])).toEqual('(InnerA1 | InnerA2)');
        expect(innerChoices[1]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[1])).toEqual('(InnerB1 | InnerB2)');
        expect(innerChoices[2]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[2])).toEqual('(InnerC1 | InnerC2)');
        expect(innerChoices[3]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[3])).toEqual('(InnerD1 | InnerD2)');
        expect(innerChoices[4]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[4])).toEqual('(InnerE1 | InnerE2)');
        const innerAMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoices[0]);
        expect(innerAMembers.length).toEqual(2);
        expect(innerAMembers[0].title).toEqual('InnerA1');
        expect(innerAMembers[1].title).toEqual('InnerA2');
        const innerEMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoices[4]);
        expect(innerEMembers.length).toEqual(2);
        expect(innerEMembers[0].title).toEqual('InnerE1');
        expect(innerEMembers[1].title).toEqual('InnerE2');
      });

      it('indirect nested choice via group ref: group xs:choice appears as nested ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[7].title).toEqual('IndirectNestedChoiceElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[7]);
        expect(outerChoiceChildren.length).toEqual(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toEqual('(Indirect1 | choice)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers.length).toEqual(2);
        expect(outerMembers[0]).not.toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerMembers[0].title).toEqual('Indirect1');
        const innerChoiceNode = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceNode.title).toEqual('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceNode)).toEqual('(ChoiceGroupEl1 | ChoiceGroupEl2)');
        const innerMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
        expect(innerMembers.length).toEqual(2);
        expect(innerMembers[0].title).toEqual('ChoiceGroupEl1');
        expect(innerMembers[1].title).toEqual('ChoiceGroupEl2');
      });
    });
  });

  describe('nested choice fields', () => {
    function createNestedChoiceFields(outerSelectedIndex?: number, innerSelectedIndex?: number) {
      const baseField = sourceDoc.fields[0];
      const innerMembers = [
        { ...baseField, name: 'x', displayName: 'x', fields: [] },
        { ...baseField, name: 'y', displayName: 'y', fields: [] },
      ];
      const innerChoice = {
        ...baseField,
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: innerMembers,
        selectedMemberIndex: innerSelectedIndex,
      };
      const regularMember = {
        ...baseField,
        name: 'regularField',
        displayName: 'regularField',
        fields: [],
      };
      const outerMembers = [innerChoice, regularMember];
      const outerChoice = {
        ...baseField,
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: outerMembers,
        selectedMemberIndex: outerSelectedIndex,
      } as unknown as typeof baseField;
      return { outerChoice, innerChoice, regularMember, innerMembers };
    }

    it('both unselected: outer shows as ChoiceFieldNodeData with all members', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields();
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBeUndefined();

      const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(outerChildren.length).toEqual(2);
      expect(outerChildren[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerChildren[0].title).toEqual(innerChoice.displayName);
      expect(outerChildren[1]).toBeInstanceOf(FieldNodeData);
      expect(outerChildren[1]).not.toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerChildren[1].title).toEqual('regularField');
    });

    it('outer selected with inner choice: shows inner choice directly with choiceField reference', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerNode.field).toBe(innerChoice);
      expect(outerNode.choiceField).toBe(outerChoice);

      const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(innerChildren.length).toEqual(2);
      expect(innerChildren[0].title).toEqual('x');
      expect(innerChildren[1].title).toEqual('y');
    });

    it('inner selected, outer unselected: inner choice shows selected member', () => {
      const { outerChoice } = createNestedChoiceFields(undefined, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBeUndefined();

      const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(outerChildren.length).toEqual(2);
      const innerNode = outerChildren[0] as ChoiceFieldNodeData;
      expect(innerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(innerNode.title).toEqual('y');
      expect(innerNode.choiceField).not.toBeUndefined();
      expect(outerChildren[1].title).toEqual('regularField');
    });

    it('both selected: resolves in two steps with choiceField references at each level', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerNode.field).toBe(innerChoice);
      expect(outerNode.choiceField).toBe(outerChoice);

      const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(innerChildren.length).toEqual(1);
      const innerNode = innerChildren[0] as ChoiceFieldNodeData;
      expect(innerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(innerNode.title).toEqual('y');
      expect(innerNode.choiceField).toBe(innerChoice);
    });

    it('multi-step revert: reverting inner selection restores inner choice members', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const outerNode = children[0] as ChoiceFieldNodeData;
      const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      const innerNode = innerChildren[0] as ChoiceFieldNodeData;
      expect(innerNode.choiceField).toBe(innerChoice);

      innerNode.choiceField!.selectedMemberIndex = undefined;

      const refreshedInnerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(refreshedInnerChildren.length).toEqual(2);
      expect(refreshedInnerChildren[0].title).toEqual('x');
      expect(refreshedInnerChildren[1].title).toEqual('y');
      expect((refreshedInnerChildren[0] as ChoiceFieldNodeData).choiceField).toBeUndefined();
    });

    it('multi-step revert: reverting outer selection after inner restores outer choice members', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      innerChoice.selectedMemberIndex = undefined;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBe(outerChoice);

      outerNode.choiceField!.selectedMemberIndex = undefined;

      const refreshedChildren = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(refreshedChildren.length).toEqual(1);
      const refreshedOuterNode = refreshedChildren[0] as ChoiceFieldNodeData;
      expect(refreshedOuterNode.choiceField).toBeUndefined();

      const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(refreshedOuterNode);
      expect(outerMembers.length).toEqual(2);
      expect(outerMembers[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerMembers[1].title).toEqual('regularField');
    });
  });

  describe('getChoiceMemberLabel', () => {
    it('should return member names joined with | in parentheses', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }]);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toEqual('(email | phone | fax)');
    });

    it('should return "(empty)" for a choice with no members', () => {
      const choiceField = createMockChoiceField([]);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toEqual('(empty)');
    });

    it('should label a single nested choice member as "choice"', () => {
      const baseField = sourceDoc.fields[0];
      const innerChoice = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [],
      };
      const choiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [innerChoice, { ...baseField, name: 'direct', displayName: 'direct', fields: [] }],
      } as unknown as typeof baseField;
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toEqual('(choice | direct)');
    });

    it('should distinguish multiple nested choices with numbered labels', () => {
      const baseField = sourceDoc.fields[0];
      const inner1 = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [],
      };
      const inner2 = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [],
      };
      const choiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [inner1, inner2],
      } as unknown as typeof baseField;
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toEqual('(choice1 | choice2)');
    });

    it('should truncate long member lists showing first 3 and count', () => {
      const members = Array.from({ length: 10 }, (_, i) => ({ name: `member${i}` }));
      const choiceField = createMockChoiceField(members);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toEqual('(member0 | member1 | member2 | +7 more)');
    });
  });

  describe('createNodeTitle', () => {
    it('should return member label for unselected choice wrapper (no choiceField)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationService.createNodeTitle(choiceNode)).toEqual('(email | phone)');
    });

    it('should return nodeData.title for selected choice member (choiceField set)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const parentField = { ...sourceDoc.fields[0], fields: [choiceField] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as ChoiceFieldNodeData;
      expect(selectedNode.choiceField).toBeDefined();
      expect(VisualizationService.createNodeTitle(selectedNode)).toEqual('email');
    });

    it('should return nodeData.title for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationService.createNodeTitle(fieldNode)).toEqual(fieldNode.title);
    });

    it('should return member label for unselected TargetChoiceFieldNodeData', () => {
      const choiceField = createMockChoiceField([{ name: 'a' }, { name: 'b' }]);
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      expect(VisualizationService.createNodeTitle(choiceNode)).toEqual('(a | b)');
    });
  });

  describe('engageMapping with choice source', () => {
    let localTargetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should create ChooseItem with WhenItems and OtherwiseItem for choice source with 2 members', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('each WhenItem expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toEqual('/ns0:email');
      expect(chooseItem.when[1].expression).toEqual('/ns0:phone');
    });

    it('each WhenItem ValueSelector expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(emailSelector.expression).toEqual('/ns0:email');
      expect(phoneSelector.expression).toEqual('/ns0:phone');
    });

    it('should create ChooseItem when dropping choice source onto an existing FieldItemNodeData target', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
      MappingActionService.engageMapping(
        tree,
        sourceDocChildren[0] as FieldNodeData,
        targetDocChildren[0] as TargetNodeData,
      );

      const updatedTargetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
      const fieldItemNode = updatedTargetDocChildren[0] as FieldItemNodeData;
      expect(fieldItemNode).toBeInstanceOf(FieldItemNodeData);

      const valueSelectorBefore = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
      expect(valueSelectorBefore).toBe(true);

      MappingActionService.engageMapping(tree, choiceNode, fieldItemNode);

      const chooseItem = fieldItemNode.mapping.children.find((c) => c instanceof ChooseItem) as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
      const valueSelectorAfter = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
      expect(valueSelectorAfter).toBe(false);
    });

    it('should create ChooseItem with only OtherwiseItem for empty-member choice source', () => {
      const choiceField = createMockChoiceField([]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(0);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('should create a simple field mapping when dragging a selected choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const selectedMember = choiceField.fields[0];
      const choiceNode = new ChoiceFieldNodeData(
        sourceDocNode,
        selectedMember as unknown as (typeof sourceDoc.fields)[0],
      );
      choiceNode.choiceField = choiceField;
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);
      expect(targetFieldItem.children[0]).toBeInstanceOf(ValueSelector);
      expect(targetFieldItem.children[0]).not.toBeInstanceOf(ChooseItem);
    });

    it('should not create duplicate ChooseItem when mapping the same choice source twice', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);
      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const targetFieldItem = tree.children[0];
      const chooseItems = targetFieldItem.children.filter((c) => c instanceof ChooseItem);
      expect(chooseItems.length).toEqual(1);
    });
  });

  describe('mapping collection choice (maxOccurs > 1)', () => {
    let localTargetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      const localTargetDoc = TestUtil.createTargetOrderDoc();
      const localTree = new MappingTree(
        localTargetDoc.documentType,
        localTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      localTargetDocNode = new TargetDocumentNodeData(localTargetDoc, localTree);
    });

    it('should create ChooseItem for collection choice (same as non-collection)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], undefined, 'unbounded');
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);
      const localTree = localTargetDocNode.mappingTree;

      MappingActionService.engageMapping(localTree, choiceNode, targetFieldNode);

      expect(localTree.children.length).toEqual(1);
      const targetFieldItem = localTree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('should create ChooseItem with correct when expressions for collection choice', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], undefined, 'unbounded');
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);
      const localTree = localTargetDocNode.mappingTree;

      MappingActionService.engageMapping(localTree, choiceNode, targetFieldNode);

      const chooseItem = localTree.children[0].children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toEqual('/ns0:email');
      expect(chooseItem.when[1].expression).toEqual('/ns0:phone');
    });

    it('should create ValueSelectors inside when branches for collection choice', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], undefined, 'unbounded');
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);
      const localTree = localTargetDocNode.mappingTree;

      MappingActionService.engageMapping(localTree, choiceNode, targetFieldNode);

      const chooseItem = localTree.children[0].children[0] as ChooseItem;
      const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(emailSelector.expression).toEqual('/ns0:email');
      expect(phoneSelector.expression).toEqual('/ns0:phone');
    });

    it('should verify collection choice field is detected as collection', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], undefined, 'unbounded');
      expect(DocumentService.isCollectionField(choiceField)).toBe(true);
    });

    it('should not create ForEachItem for non-collection choice (maxOccurs=1)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);
      const localTree = localTargetDocNode.mappingTree;

      MappingActionService.engageMapping(localTree, choiceNode, targetFieldNode);

      expect(localTree.children.length).toEqual(1);
      const targetFieldItem = localTree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0];
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      // Verify no ForEachItem exists anywhere in the subtree (not just the direct child,
      // since ChooseItem and ForEachItem are disjoint classes making instanceof tautological)
      expect(targetFieldItem.children.some((c) => c instanceof ForEachItem)).toBe(false);
    });
  });

  describe('mapping through unselected target choice wrapper', () => {
    let localTargetDocNode: TargetDocumentNodeData;
    let parentFieldNode: TargetFieldNodeData;
    let choiceField: ReturnType<typeof createMockChoiceField>;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      choiceField = createMockChoiceField([{ name: 'contactEmail' }, { name: 'contactPhone' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      parentFieldNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
    });

    it('getOrCreateFieldItem should skip unselected choice wrapper and create FieldItem under grandparent', () => {
      // Build the node hierarchy: parentField -> choiceWrapper -> memberField
      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      // choiceField property is undefined = unselected wrapper
      expect(choiceNode.choiceField).toBeUndefined();

      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      // engageMapping triggers getOrCreateFieldItem for the member inside the choice wrapper
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      // The mapping tree should have the member's FieldItem directly under the parent FieldItem,
      // not under a spurious choice wrapper FieldItem.
      const parentItem = tree.children[0]; // FieldItem for parentField (e.g. ShipOrder)
      expect(parentItem).toBeInstanceOf(FieldItem);
      const memberItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberField,
      ) as FieldItem;
      expect(memberItem).toBeDefined();
      expect(memberItem.field.name).toEqual('contactEmail');
    });

    it('generateNonDocumentNodeDataChildren should find mappings for fields inside unselected choice wrapper', () => {
      // First create a mapping for a member field inside the choice wrapper
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      // Build the node hierarchy and engage mapping
      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      // Now regenerate the target tree from scratch and verify the choice wrapper children
      // resolve the existing mapping correctly
      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const freshParentNode = new TargetFieldNodeData(
        freshTargetDocNode,
        freshParentField as (typeof targetDoc.fields)[0],
      );
      // parentField should have a mapping now
      freshParentNode.mapping = tree.children[0] as FieldItem;

      const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
      // Unselected wrapper — choiceField property is undefined
      const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);

      // The member 'contactEmail' should be rendered as a FieldItemNodeData (has mapping),
      // not as a plain TargetFieldNodeData (no mapping found)
      const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail');
      expect(contactEmailNode).toBeDefined();
      expect(contactEmailNode).toBeInstanceOf(FieldItemNodeData);
    });

    it('FieldItemNodeData.path should include choice wrapper segment while FieldItem.nodePath should not', () => {
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentItem = tree.children[0] as FieldItem;
      const freshParentNode = new FieldItemNodeData(freshTargetDocNode, parentItem);
      freshParentNode.field = {
        ...freshParentNode.field,
        fields: [choiceField],
      } as typeof freshParentNode.field;

      const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
      const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);
      const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;

      const mappingFieldItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberField,
      ) as FieldItem;
      // Visual path includes choice wrapper segment; mapping path does not.
      // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
      expect(contactEmailNode.path.pathSegments).toContain(choiceField.id);
      expect(mappingFieldItem.nodePath.pathSegments).not.toContain(choiceField.id);
    });

    it('should work for nested fields inside choice member (mapping + rendering + path)', () => {
      // Create a choice field where the member has nested children
      const baseField = sourceDoc.fields[0];
      const nestedField = {
        ...baseField,
        name: 'emailAddress',
        displayName: 'emailAddress',
        fields: [] as unknown[],
      } as unknown as typeof baseField;
      const memberWithChildren = {
        ...baseField,
        name: 'contactEmail',
        displayName: 'contactEmail',
        fields: [nestedField],
      } as unknown as typeof baseField;
      (nestedField as unknown as Record<string, unknown>).parent = memberWithChildren;
      const nestedChoiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        selectedMemberIndex: undefined,
        fields: [memberWithChildren],
      } as unknown as typeof baseField;

      const nestedParentField = {
        ...targetDoc.fields[0],
        fields: [nestedChoiceField],
      };
      const nestedParentNode = new TargetFieldNodeData(
        localTargetDocNode,
        nestedParentField as (typeof targetDoc.fields)[0],
      );

      // Build the visual tree: parent → choice → contactEmail → emailAddress
      const nestedChoiceNode = new TargetChoiceFieldNodeData(nestedParentNode, nestedChoiceField);
      const contactEmailNode = new TargetFieldNodeData(nestedChoiceNode, memberWithChildren);
      const emailAddressNode = new TargetFieldNodeData(contactEmailNode, nestedField);

      // Map source to the nested emailAddress field
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, emailAddressNode);

      // Verify mapping tree structure: parent → contactEmail → emailAddress
      const parentItem = tree.children[0] as FieldItem;
      expect(parentItem).toBeInstanceOf(FieldItem);
      const contactEmailItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberWithChildren,
      ) as FieldItem;
      expect(contactEmailItem).toBeDefined();
      const emailAddressItem = contactEmailItem.children.find(
        (c) => c instanceof FieldItem && c.field === nestedField,
      ) as FieldItem;
      expect(emailAddressItem).toBeDefined();

      // Verify ValueSelector was created with an expression
      const valueSelector = emailAddressItem.children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(valueSelector).toBeDefined();
      expect(valueSelector.expression).not.toEqual('');

      // Re-render using FieldItemNodeData for the parent (realistic rendering)
      const freshTargetDocNode2 = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentNode2 = new FieldItemNodeData(freshTargetDocNode2, parentItem);
      freshParentNode2.field = {
        ...freshParentNode2.field,
        fields: [nestedChoiceField],
      } as typeof freshParentNode2.field;

      const freshChoiceNode2 = new TargetChoiceFieldNodeData(freshParentNode2, nestedChoiceField);
      const freshChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode2);

      // contactEmail should be found as FieldItemNodeData
      const freshContactEmailNode = freshChoiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;
      expect(freshContactEmailNode).toBeInstanceOf(FieldItemNodeData);

      // Expand contactEmail — emailAddress should be found as FieldItemNodeData
      const contactEmailChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshContactEmailNode);
      const freshEmailAddressNode = contactEmailChildren.find((c) => c.title === 'emailAddress');
      expect(freshEmailAddressNode).toBeDefined();
      expect(freshEmailAddressNode).toBeInstanceOf(FieldItemNodeData);

      // Visual path includes choice wrapper segment; mapping path does not.
      // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
      expect((freshEmailAddressNode as FieldItemNodeData).path.pathSegments).toContain(nestedChoiceField.id);
      expect(emailAddressItem.nodePath.pathSegments).not.toContain(nestedChoiceField.id);
    });
  });

  describe('nested choice wrappers (choice inside choice)', () => {
    it('should map to a field inside a nested choice and render the mapping correctly', () => {
      // Use TestDocument.xsd which has DirectNestedChoiceElement:
      //   <xs:choice>
      //     <xs:element name="Direct1"/>
      //     <xs:choice>
      //       <xs:element name="NestedDirect1"/>
      //       <xs:element name="NestedDirect2"/>
      //     </xs:choice>
      //   </xs:choice>
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'testDocument.xsd': getTestDocumentXsd() },
      );
      const testTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      const testTree = new MappingTree(
        testTargetDoc.documentType,
        testTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const testTargetDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);

      // Navigate to DirectNestedChoiceElement
      const docChildren = VisualizationService.generateStructuredDocumentChildren(testTargetDocNode);
      const testDocumentNode = docChildren[0];
      const testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
      // DirectNestedChoiceElement is the 3rd child (index 2) after ChoiceElement, SiblingChoicesElement
      const directNestedNode = testDocumentChildren.find((c) => c.title === 'DirectNestedChoiceElement')!;
      const directNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(directNestedNode);

      // Should have one outer choice wrapper
      expect(directNestedChildren.length).toEqual(1);
      const outerChoice = directNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(outerChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

      // Expand outer choice: [Direct1, inner_choice]
      const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerChoice);
      expect(outerChoiceChildren[0].title).toEqual('Direct1');
      const innerChoice = outerChoiceChildren.find(
        (c) => c instanceof TargetChoiceFieldNodeData,
      ) as TargetChoiceFieldNodeData;
      expect(innerChoice).toBeDefined();

      // Expand inner choice: [NestedDirect1, NestedDirect2]
      const innerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerChoice);
      const nestedDirect1 = innerChoiceChildren.find((c) => c.title === 'NestedDirect1')! as TargetFieldNodeData;
      expect(nestedDirect1).toBeDefined();

      // Map source field to NestedDirect1 inside the nested choice
      const sourceDocChildren2 = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode2 = sourceDocChildren2[0] as FieldNodeData;
      const sourceChildren2 = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode2);
      MappingActionService.engageMapping(testTree, sourceChildren2[0] as FieldNodeData, nestedDirect1);

      // Verify mapping tree: TestDocument → DirectNestedChoiceElement → NestedDirect1
      // (both choice wrappers skipped)
      const testDocItem = testTree.children[0] as FieldItem;
      expect(testDocItem).toBeInstanceOf(FieldItem);
      const directNestedItem = testDocItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'DirectNestedChoiceElement',
      ) as FieldItem;
      expect(directNestedItem).toBeDefined();
      const nestedDirect1Item = directNestedItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'NestedDirect1',
      ) as FieldItem;
      expect(nestedDirect1Item).toBeDefined();

      // Re-render from scratch and verify nested field is found with correct path
      const freshDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);
      const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
      const freshTestDocNode = freshDocChildren[0];
      const freshTestDocChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshTestDocNode);
      const freshDirectNestedNode = freshTestDocChildren.find(
        (c) => c.title === 'DirectNestedChoiceElement',
      )! as FieldItemNodeData;
      expect(freshDirectNestedNode).toBeInstanceOf(FieldItemNodeData);

      // DirectNestedChoiceElement → [outerChoice]
      const freshDirectNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshDirectNestedNode);
      const freshOuterChoice = freshDirectNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(freshOuterChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

      // outerChoice → [Direct1, innerChoice]
      const freshOuterChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshOuterChoice);
      const freshInnerChoice = freshOuterChoiceChildren.find(
        (c) => c instanceof TargetChoiceFieldNodeData,
      ) as TargetChoiceFieldNodeData;
      expect(freshInnerChoice).toBeDefined();

      // innerChoice → [NestedDirect1, NestedDirect2]
      const freshInnerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshInnerChoice);
      const freshNestedDirect1 = freshInnerChoiceChildren.find((c) => c.title === 'NestedDirect1');
      expect(freshNestedDirect1).toBeDefined();
      expect(freshNestedDirect1).toBeInstanceOf(FieldItemNodeData);

      // Visual path includes both choice wrapper segments; mapping path includes neither.
      // MappingLinksService.computeVisualTargetNodePath bridges this gap for line rendering.
      expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshOuterChoice.id);
      expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshInnerChoice.id);
      expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshOuterChoice.id);
      expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshInnerChoice.id);
    });
  });
});
