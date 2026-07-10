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
import { ChoiceSelectionService } from '../document/choice-selection.service';
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
      expect(children).toHaveLength(1);
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
      expect(children).toHaveLength(1);
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
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(children[0].title).toBe('email');
    });

    it('should create TargetChoiceFieldNodeData with selected member for target choice fields', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }], 1);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(TargetChoiceFieldNodeData);
      expect(children[0].title).toBe('phone');
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
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
    });
  });

  describe('generateNonDocumentNodeDataChildren for choice nodes', () => {
    it('should expand all choice members as children', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
      expect(children).toHaveLength(2);
    });

    it('should fall back to all members when selectedMemberIndex is out of bounds', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 99);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
      expect(children).toHaveLength(2);
      expect(children[0].title).toBe('email');
      expect(children[1].title).toBe('phone');
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
        expect(testDocumentChildren[2].title).toBe('ChoiceElement');
        const choiceElementChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[2]);
        expect(choiceElementChildren).toHaveLength(1);
        const choiceNode = choiceElementChildren[0] as ChoiceFieldNodeData;
        expect(choiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(choiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(choiceNode)).toBe('(Choice1 | Choice2 | Group1Element1 | +1 more)');
        const members = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode);
        expect(members).toHaveLength(4);
        expect(members[0].title).toBe('Choice1');
        expect(members[1].title).toBe('Choice2');
        expect(members[2].title).toBe('Group1Element1');
        expect(members[3].title).toBe('Group1Element2');
      });

      it('sibling choices: two sibling xs:choice wrappers appear as distinct ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[3].title).toBe('SiblingChoicesElement');
        const children = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[3]);
        expect(children).toHaveLength(2);
        expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(children[0].title).toBe('choice');
        expect(VisualizationService.createNodeTitle(children[0] as ChoiceFieldNodeData)).toBe('(SibA1 | SibA2)');
        expect(children[1]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(children[1].title).toBe('choice');
        expect(VisualizationService.createNodeTitle(children[1] as ChoiceFieldNodeData)).toBe('(SibB1 | SibB2)');
        const firstMembers = VisualizationService.generateNonDocumentNodeDataChildren(
          children[0] as ChoiceFieldNodeData,
        );
        expect(firstMembers).toHaveLength(2);
        expect(firstMembers[0].title).toBe('SibA1');
        expect(firstMembers[1].title).toBe('SibA2');
        const secondMembers = VisualizationService.generateNonDocumentNodeDataChildren(
          children[1] as ChoiceFieldNodeData,
        );
        expect(secondMembers).toHaveLength(2);
        expect(secondMembers[0].title).toBe('SibB1');
        expect(secondMembers[1].title).toBe('SibB2');
      });

      it('direct nested choice: inner xs:choice appears as nested ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[4].title).toBe('DirectNestedChoiceElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[4]);
        expect(outerChoiceChildren).toHaveLength(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toBe('(Direct1 | NestedDirect1 | NestedDirect2)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers).toHaveLength(2);
        expect(outerMembers[0]).not.toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerMembers[0].title).toBe('Direct1');
        const innerChoiceNode = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceNode)).toBe('(NestedDirect1 | NestedDirect2)');
        const innerMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
        expect(innerMembers).toHaveLength(2);
        expect(innerMembers[0].title).toBe('NestedDirect1');
        expect(innerMembers[1].title).toBe('NestedDirect2');
      });

      it('multiple nested choices: outer title uses numbered suffixes without truncation', () => {
        expect(testDocumentChildren[5].title).toBe('MultipleNestedChoicesElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[5]);
        expect(outerChoiceChildren).toHaveLength(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toBe('(InnerA1 | InnerA2 | InnerB1 | +1 more)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers).toHaveLength(2);
        const innerChoiceA = outerMembers[0] as ChoiceFieldNodeData;
        expect(innerChoiceA).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceA.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceA)).toBe('(InnerA1 | InnerA2)');
        const innerChoiceB = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceB).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceB.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceB)).toBe('(InnerB1 | InnerB2)');
        const innerAMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceA);
        expect(innerAMembers).toHaveLength(2);
        expect(innerAMembers[0].title).toBe('InnerA1');
        expect(innerAMembers[1].title).toBe('InnerA2');
        const innerBMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceB);
        expect(innerBMembers).toHaveLength(2);
        expect(innerBMembers[0].title).toBe('InnerB1');
        expect(innerBMembers[1].title).toBe('InnerB2');
      });

      it('too many nested choices: outer title is truncated with numbered suffixes', () => {
        expect(testDocumentChildren[6].title).toBe('TooManyNestedChoicesElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[6]);
        expect(outerChoiceChildren).toHaveLength(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toBe('(InnerA1 | InnerA2 | InnerB1 | +7 more)');
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers).toHaveLength(5);
        const innerChoices = outerMembers as ChoiceFieldNodeData[];
        expect(innerChoices[0]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[0])).toBe('(InnerA1 | InnerA2)');
        expect(innerChoices[1]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[1])).toBe('(InnerB1 | InnerB2)');
        expect(innerChoices[2]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[2])).toBe('(InnerC1 | InnerC2)');
        expect(innerChoices[3]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[3])).toBe('(InnerD1 | InnerD2)');
        expect(innerChoices[4]).toBeInstanceOf(ChoiceFieldNodeData);
        expect(VisualizationService.createNodeTitle(innerChoices[4])).toBe('(InnerE1 | InnerE2)');
        const innerAMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoices[0]);
        expect(innerAMembers).toHaveLength(2);
        expect(innerAMembers[0].title).toBe('InnerA1');
        expect(innerAMembers[1].title).toBe('InnerA2');
        const innerEMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoices[4]);
        expect(innerEMembers).toHaveLength(2);
        expect(innerEMembers[0].title).toBe('InnerE1');
        expect(innerEMembers[1].title).toBe('InnerE2');
      });

      it('indirect nested choice via group ref: group xs:choice appears as nested ChoiceFieldNodeData in order', () => {
        expect(testDocumentChildren[7].title).toBe('IndirectNestedChoiceElement');
        const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentChildren[7]);
        expect(outerChoiceChildren).toHaveLength(1);
        const outerChoiceNode = outerChoiceChildren[0] as ChoiceFieldNodeData;
        expect(outerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(outerChoiceNode)).toBe(
          '(Indirect1 | ChoiceGroupEl1 | ChoiceGroupEl2)',
        );
        const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
        expect(outerMembers).toHaveLength(2);
        expect(outerMembers[0]).not.toBeInstanceOf(ChoiceFieldNodeData);
        expect(outerMembers[0].title).toBe('Indirect1');
        const innerChoiceNode = outerMembers[1] as ChoiceFieldNodeData;
        expect(innerChoiceNode).toBeInstanceOf(ChoiceFieldNodeData);
        expect(innerChoiceNode.title).toBe('choice');
        expect(VisualizationService.createNodeTitle(innerChoiceNode)).toBe('(ChoiceGroupEl1 | ChoiceGroupEl2)');
        const innerMembers = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
        expect(innerMembers).toHaveLength(2);
        expect(innerMembers[0].title).toBe('ChoiceGroupEl1');
        expect(innerMembers[1].title).toBe('ChoiceGroupEl2');
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
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(ChoiceFieldNodeData);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBeUndefined();

      const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(outerChildren).toHaveLength(2);
      expect(outerChildren[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerChildren[0].title).toEqual(innerChoice.displayName);
      expect(outerChildren[1]).toBeInstanceOf(FieldNodeData);
      expect(outerChildren[1]).not.toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerChildren[1].title).toBe('regularField');
    });

    it('outer selected with inner choice: shows inner choice directly with choiceField reference', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerNode.field).toBe(innerChoice);
      expect(outerNode.choiceField).toBe(outerChoice);

      const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(innerChildren).toHaveLength(2);
      expect(innerChildren[0].title).toBe('x');
      expect(innerChildren[1].title).toBe('y');
    });

    it('inner selected, outer unselected: inner choice shows selected member', () => {
      const { outerChoice } = createNestedChoiceFields(undefined, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBeUndefined();

      const outerChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(outerChildren).toHaveLength(2);
      const innerNode = outerChildren[0] as ChoiceFieldNodeData;
      expect(innerNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(innerNode.title).toBe('y');
      expect(innerNode.choiceField).toBeDefined();
      expect(outerChildren[1].title).toBe('regularField');
    });

    it('both selected: flattens nested wrappers and shows final selected member directly', () => {
      const { outerChoice, innerChoice, innerMembers } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      const flattenedNode = children[0] as ChoiceFieldNodeData;
      expect(flattenedNode).toBeInstanceOf(ChoiceFieldNodeData);
      expect(flattenedNode.field).toBe(innerMembers[1]);
      expect(flattenedNode.field.name).toBe('y');
      expect(flattenedNode.choiceField).toBe(innerChoice);
    });

    it('multi-step revert: reverting inner selection shows inner choice as unselected wrapper', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      innerChoice.selectedMemberIndex = undefined;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      const node = children[0] as ChoiceFieldNodeData;
      expect(node).toBeInstanceOf(ChoiceFieldNodeData);
      expect(node.field).toBe(innerChoice);
      expect(node.choiceField).toBe(outerChoice);

      const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(node);
      expect(innerChildren).toHaveLength(2);
      expect(innerChildren[0].title).toBe('x');
      expect(innerChildren[1].title).toBe('y');
    });

    it('multi-step revert: reverting outer selection restores outer choice members', () => {
      const { outerChoice, innerChoice } = createNestedChoiceFields(0, 1);
      const parentField = { ...sourceDoc.fields[0], fields: [outerChoice] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);

      innerChoice.selectedMemberIndex = undefined;
      outerChoice.selectedMemberIndex = undefined;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      const outerNode = children[0] as ChoiceFieldNodeData;
      expect(outerNode.choiceField).toBeUndefined();

      const outerMembers = VisualizationService.generateNonDocumentNodeDataChildren(outerNode);
      expect(outerMembers).toHaveLength(2);
      expect(outerMembers[0]).toBeInstanceOf(ChoiceFieldNodeData);
      expect(outerMembers[1].title).toBe('regularField');
    });
  });

  describe('getChoiceMemberLabel', () => {
    it('should return member names joined with | in parentheses', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }, { name: 'fax' }]);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(email | phone | fax)');
    });

    it('should return "(empty)" for a choice with no members', () => {
      const choiceField = createMockChoiceField([]);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(empty)');
    });

    it('should dissolve a nested choice into its inner member names', () => {
      const baseField = sourceDoc.fields[0];
      const innerChoice = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [
          { ...baseField, name: 'innerA', displayName: 'InnerA', fields: [] },
          { ...baseField, name: 'innerB', displayName: 'InnerB', fields: [] },
        ],
      };
      const choiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [innerChoice, { ...baseField, name: 'direct', displayName: 'direct', fields: [] }],
      } as unknown as typeof baseField;
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(InnerA | InnerB | direct)');
    });

    it('should fall back to nested choice displayName when it has no members', () => {
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
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(choice | choice)');
    });

    it('should truncate long member lists showing first 3 and count', () => {
      const members = Array.from({ length: 10 }, (_, i) => ({ name: `member${i}` }));
      const choiceField = createMockChoiceField(members);
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(member0 | member1 | member2 | +7 more)');
    });

    it('should dissolve abstract member into its substitution candidate names', () => {
      const baseField = sourceDoc.fields[0];
      const abstractMember = {
        ...baseField,
        name: 'AbstractMsg',
        displayName: 'AbstractMsg',
        wrapperKind: 'abstract' as const,
        fields: [
          { ...baseField, name: 'Email', displayName: 'Email', fields: [] },
          { ...baseField, name: 'SMS', displayName: 'SMS', fields: [] },
        ],
      };
      const choiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [abstractMember, { ...baseField, name: 'Webhook', displayName: 'Webhook', fields: [] }],
      } as unknown as typeof baseField;
      expect(VisualizationService.getChoiceMemberLabel(choiceField)).toBe('(Email | SMS | Webhook)');
    });
  });

  describe('createNodeTitle', () => {
    it('should return member label for unselected choice wrapper (no choiceField)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationService.createNodeTitle(choiceNode)).toBe('(email | phone)');
    });

    it('should return nodeData.title for selected choice member (choiceField set)', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const parentField = { ...sourceDoc.fields[0], fields: [choiceField] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as ChoiceFieldNodeData;
      expect(selectedNode.choiceField).toBeDefined();
      expect(VisualizationService.createNodeTitle(selectedNode)).toBe('email');
    });

    it('should return nodeData.title for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationService.createNodeTitle(fieldNode)).toEqual(fieldNode.title);
    });

    it('should return member label for unselected TargetChoiceFieldNodeData', () => {
      const choiceField = createMockChoiceField([{ name: 'a' }, { name: 'b' }]);
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      expect(VisualizationService.createNodeTitle(choiceNode)).toBe('(a | b)');
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

      expect(tree.children).toHaveLength(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children).toHaveLength(1);

      const chooseItem = targetFieldItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when).toHaveLength(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('each WhenItem expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toBe('/ns0:email');
      expect(chooseItem.when[1].expression).toBe('/ns0:phone');
    });

    it('each WhenItem ValueSelector expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(emailSelector.expression).toBe('/ns0:email');
      expect(phoneSelector.expression).toBe('/ns0:phone');
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
      expect(chooseItem.when).toHaveLength(2);
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
      expect(chooseItem.when).toHaveLength(0);
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

      expect(tree.children).toHaveLength(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children).toHaveLength(1);
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
      expect(chooseItems).toHaveLength(1);
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

      expect(localTree.children).toHaveLength(1);
      const targetFieldItem = localTree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children).toHaveLength(1);

      const chooseItem = targetFieldItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when).toHaveLength(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('should create ChooseItem with correct when expressions for collection choice', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], undefined, 'unbounded');
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);
      const localTree = localTargetDocNode.mappingTree;

      MappingActionService.engageMapping(localTree, choiceNode, targetFieldNode);

      const chooseItem = localTree.children[0].children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toBe('/ns0:email');
      expect(chooseItem.when[1].expression).toBe('/ns0:phone');
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
      expect(emailSelector.expression).toBe('/ns0:email');
      expect(phoneSelector.expression).toBe('/ns0:phone');
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

      expect(localTree.children).toHaveLength(1);
      const targetFieldItem = localTree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children).toHaveLength(1);

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
      expect(memberItem.field.name).toBe('contactEmail');
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
      expect(valueSelector.expression).not.toBe('');

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

      // Navigate to DirectNestedChoiceElement via IField tree
      // (unconfigured target wrappers hide children, so we construct nodes manually)
      const docChildren = VisualizationService.generateStructuredDocumentChildren(testTargetDocNode);
      const testDocumentNode = docChildren[0];
      const testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
      const directNestedNode = testDocumentChildren.find((c) => c.title === 'DirectNestedChoiceElement')!;

      const directNestedField = (directNestedNode as TargetFieldNodeData).field;
      const outerChoiceField = directNestedField.fields.find((f) => f.wrapperKind === 'choice')!;
      const innerChoiceField = outerChoiceField.fields.find((f) => f.wrapperKind === 'choice')!;
      const nestedDirect1Field = innerChoiceField.fields.find((f) => f.name === 'NestedDirect1')!;

      const outerChoice = new TargetChoiceFieldNodeData(directNestedNode as TargetFieldNodeData, outerChoiceField);
      const innerChoice = new TargetChoiceFieldNodeData(outerChoice, innerChoiceField);
      const nestedDirect1 = new TargetFieldNodeData(innerChoice, nestedDirect1Field);

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

  describe('target-side nested choice selection flow', () => {
    it('selecting outer choice → inner choice should show inner choice as unconfigured wrapper', () => {
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

      // Navigate to MultipleNestedChoicesElement
      const docChildren = VisualizationService.generateStructuredDocumentChildren(testTargetDocNode);
      const testDocumentNode = docChildren[0];
      const testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
      const multiNestedNode = testDocumentChildren.find((c) => c.title === 'MultipleNestedChoicesElement')!;
      expect(multiNestedNode).toBeDefined();

      // Expand → should see unconfigured outer choice
      const multiNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(multiNestedNode);
      expect(multiNestedChildren).toHaveLength(1);
      const outerChoiceNode = multiNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(outerChoiceNode).toBeInstanceOf(TargetChoiceFieldNodeData);
      expect(outerChoiceNode.field.wrapperKind).toBe('choice');

      // Outer choice children should be hidden (unconfigured target wrapper)
      const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerChoiceNode);
      expect(outerChoiceChildren).toHaveLength(0);

      // Simulate user selecting inner choice A (index 0) via context menu
      const outerChoiceField = outerChoiceNode.field;
      const nsMap = testTree.namespaceMap;
      ChoiceSelectionService.setChoiceSelection(testTargetDoc, outerChoiceField, 0, nsMap);

      // Re-render from scratch
      const freshDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);
      const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
      const freshTestDocNode = freshDocChildren[0];
      const freshChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshTestDocNode);
      const freshMultiNested = freshChildren.find((c) => c.title === 'MultipleNestedChoicesElement')!;
      const freshMultiNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshMultiNested);
      expect(freshMultiNestedChildren).toHaveLength(1);

      const innerChoiceNode = freshMultiNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(innerChoiceNode).toBeInstanceOf(TargetChoiceFieldNodeData);

      // Inner choice should be displayed as itself (wrapper), NOT as its first member
      expect(innerChoiceNode.field.wrapperKind).toBe('choice');
      expect(innerChoiceNode.field.selectedMemberIndex).toBeUndefined();

      // Inner choice title should show member label, not a specific member name
      const innerTitle = VisualizationService.createNodeTitle(innerChoiceNode);
      expect(innerTitle).toBe('(InnerA1 | InnerA2)');

      // Inner choice children should be hidden (unconfigured target wrapper)
      const innerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerChoiceNode);
      expect(innerChoiceChildren).toHaveLength(0);
    });
  });
});
