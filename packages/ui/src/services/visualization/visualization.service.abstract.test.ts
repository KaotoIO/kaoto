import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { getFieldSubstitutionXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

describe('VisualizationService / abstract fields', () => {
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

  function createMockAbstractField(
    candidates: { name: string; children?: { name: string }[] }[],
    selectedMemberIndex?: number,
  ) {
    const baseField = sourceDoc.fields[0];
    const candidateFields = candidates.map((c) => ({
      ...baseField,
      name: c.name,
      displayName: c.name,
      fields: (c.children ?? []).map((child) => ({
        ...baseField,
        name: child.name,
        displayName: child.name,
        fields: [],
      })),
    }));
    return {
      ...baseField,
      name: 'AbstractElement',
      displayName: 'AbstractElement',
      wrapperKind: 'abstract' as const,
      selectedMemberIndex,
      fields: candidateFields,
    } as unknown as typeof baseField;
  }

  describe('hasChildren', () => {
    it('should return true for abstract field with candidates', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.hasChildren(abstractNode)).toBe(true);
    });

    it('should return false for abstract field with empty candidates', () => {
      const abstractField = createMockAbstractField([]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.hasChildren(abstractNode)).toBe(false);
    });

    it('should return false for abstract field with no candidates', () => {
      const abstractField = createMockAbstractField([]);
      abstractField.fields = [];
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.hasChildren(abstractNode)).toBe(false);
    });
  });

  describe('doGenerateNodeDataFromFields with abstract fields', () => {
    it('should create AbstractFieldNodeData for unselected source abstract fields', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
    });

    it('should create TargetAbstractFieldNodeData for unselected target abstract fields', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
    });

    it('should create AbstractFieldNodeData with selected candidate for source abstract fields', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
      expect(children[0].title).toEqual('Cat');
    });

    it('should create TargetAbstractFieldNodeData with selected candidate for target abstract fields', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }], 1);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
      expect(children[0].title).toEqual('Dog');
    });

    it('should still report isAbstractField for selected abstract candidates', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(VisualizationUtilService.isAbstractField(children[0])).toBe(true);
    });

    it('should set abstractField reference for selected abstract candidates', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 0);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const abstractNode = children[0] as AbstractFieldNodeData;
      expect(abstractNode.abstractField).toBe(abstractField);
    });

    it('should use abstract field itself when selectedMemberIndex is out of bounds', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 99);
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children.length).toEqual(1);
      expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
    });
  });

  describe('generateNonDocumentNodeDataChildren for abstract nodes', () => {
    it('should expand all abstract candidates as children', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children.length).toEqual(2);
      expect(children[0].title).toEqual('Cat');
      expect(children[1].title).toEqual('Dog');
    });

    it('should fall back to all candidates when selectedMemberIndex is out of bounds', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 99);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children.length).toEqual(2);
      expect(children[0].title).toEqual('Cat');
      expect(children[1].title).toEqual('Dog');
    });

    describe('XSD integration: abstract wrapper expandability from FieldSubstitution.xsd', () => {
      let zooChildren: ReturnType<typeof VisualizationService.generateNonDocumentNodeDataChildren>;

      beforeEach(() => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
          { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const docNode = new DocumentNodeData(result.document!);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooNode = docChildren[0];
        zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(zooNode);
      });

      it('AbstractAnimal wrapper should appear as AbstractFieldNodeData', () => {
        const abstractAnimalNode = zooChildren.find((c) => c.title === 'AbstractAnimal');
        expect(abstractAnimalNode).toBeDefined();
        expect(abstractAnimalNode).toBeInstanceOf(AbstractFieldNodeData);
        expect(VisualizationUtilService.isAbstractField(abstractAnimalNode!)).toBe(true);
      });

      it('unselected AbstractAnimal should expand to show substitution candidates, not the candidates own fields', () => {
        const abstractAnimalNode = zooChildren.find((c) => c.title === 'AbstractAnimal')!;
        const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractAnimalNode);
        const childNames = children.map((c) => c.title);
        expect(childNames).toContain('Cat');
        expect(childNames).toContain('Dog');
        expect(childNames).toContain('Fish');
        expect(childNames).toContain('Kitten');
        expect(childNames).not.toContain('Feline');
        expect(childNames).not.toContain('name');
        expect(childNames).not.toContain('indoor');
      });

      it('AbstractLabel wrapper should appear as AbstractFieldNodeData with candidates', () => {
        const abstractLabelNode = zooChildren.find((c) => c.title === 'AbstractLabel');
        expect(abstractLabelNode).toBeDefined();
        expect(abstractLabelNode).toBeInstanceOf(AbstractFieldNodeData);
        const candidates = VisualizationService.generateNonDocumentNodeDataChildren(abstractLabelNode!);
        const candidateNames = candidates.map((c) => c.title);
        expect(candidateNames).toContain('Nickname');
        expect(candidateNames).toContain('XsStringTag');
      });

      it('AbstractCount wrapper should appear as AbstractFieldNodeData with candidates', () => {
        const abstractCountNode = zooChildren.find((c) => c.title === 'AbstractCount');
        expect(abstractCountNode).toBeDefined();
        expect(abstractCountNode).toBeInstanceOf(AbstractFieldNodeData);
        const candidates = VisualizationService.generateNonDocumentNodeDataChildren(abstractCountNode!);
        const candidateNames = candidates.map((c) => c.title);
        expect(candidateNames).toContain('InlineIntCount');
        expect(candidateNames).toContain('SmallIntCount');
      });

      it('capacity should appear as regular FieldNodeData, not AbstractFieldNodeData', () => {
        const capacityNode = zooChildren.find((c) => c.title === 'capacity');
        expect(capacityNode).toBeDefined();
        expect(capacityNode).toBeInstanceOf(FieldNodeData);
        expect(capacityNode).not.toBeInstanceOf(AbstractFieldNodeData);
      });
    });

    describe('XSD integration: selected abstract field', () => {
      it('selected AbstractAnimal should show as AbstractFieldNodeData with abstractField set', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
          { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;
        const zooField = document.fields[0];
        const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;
        abstractAnimalField.selectedMemberIndex = 0;

        const docNode = new DocumentNodeData(document);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooNode = docChildren[0];
        const zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(zooNode);

        const selectedNode = zooChildren.find((c) => VisualizationUtilService.isAbstractField(c))!;
        expect(selectedNode).toBeInstanceOf(AbstractFieldNodeData);
        expect((selectedNode as AbstractFieldNodeData).abstractField).toBe(abstractAnimalField);
        expect(selectedNode.title).toEqual('Cat');
      });

      it('selected abstract should expand to show children of the selected candidate, not sibling candidates', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
          { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;
        const zooField = document.fields[0];
        const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;
        abstractAnimalField.selectedMemberIndex = 0;

        const docNode = new DocumentNodeData(document);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooNode = docChildren[0];
        const zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(zooNode);
        const selectedNode = zooChildren.find((c) => VisualizationUtilService.isAbstractField(c))!;

        const candidateChildren = VisualizationService.generateNonDocumentNodeDataChildren(selectedNode);
        const childNames = candidateChildren.map((c) => c.title);
        expect(childNames).toContain('name');
        expect(childNames).toContain('indoor');
        expect(childNames).not.toContain('Cat');
        expect(childNames).not.toContain('Dog');
        expect(childNames).not.toContain('Fish');
        expect(childNames).not.toContain('Kitten');
      });

      it('non-selected sibling wrappers remain unselected while one is selected', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          BODY_DOCUMENT_ID,
          { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
          { namespaceUri: 'http://www.example.com/SUBSTITUTION', name: 'Zoo' },
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;
        const zooField = document.fields[0];
        const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;
        abstractAnimalField.selectedMemberIndex = 0;

        const docNode = new DocumentNodeData(document);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooNode = docChildren[0];
        const zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(zooNode);

        const abstractLabelNode = zooChildren.find((c) => c.title === 'AbstractLabel') as AbstractFieldNodeData;
        expect(abstractLabelNode).toBeInstanceOf(AbstractFieldNodeData);
        expect(abstractLabelNode.abstractField).toBeUndefined();

        const selectedAnimalNode = zooChildren.find(
          (c) => VisualizationUtilService.isAbstractField(c) && c.title === 'Cat',
        ) as AbstractFieldNodeData;
        expect(selectedAnimalNode).toBeInstanceOf(AbstractFieldNodeData);
        expect(selectedAnimalNode.abstractField).toBeDefined();
      });
    });
  });

  describe('getAbstractMemberLabel', () => {
    it('should return candidate names joined with | in parentheses', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toEqual('(Cat | Dog | Fish)');
    });

    it('should return "(no candidates)" for abstract with no candidates', () => {
      const abstractField = createMockAbstractField([]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toEqual('(no candidates)');
    });

    it('should truncate long candidate lists showing first 3 and count', () => {
      const candidates = Array.from({ length: 10 }, (_, i) => ({ name: `animal${i}` }));
      const abstractField = createMockAbstractField(candidates);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toEqual(
        '(animal0 | animal1 | animal2 | +7 more)',
      );
    });

    it('should handle single candidate without truncation', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toEqual('(Cat)');
    });

    it('should handle exactly 3 candidates without truncation', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toEqual('(Cat | Dog | Fish)');
    });
  });

  describe('createNodeTitle', () => {
    it('should return candidate label for unselected abstract wrapper (no abstractField)', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.createNodeTitle(abstractNode)).toEqual('(Cat | Dog)');
    });

    it('should return nodeData.title for selected abstract candidate (abstractField set)', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 0);
      const parentField = { ...sourceDoc.fields[0], fields: [abstractField] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as AbstractFieldNodeData;
      expect(selectedNode.abstractField).toBeDefined();
      expect(VisualizationService.createNodeTitle(selectedNode)).toEqual('Cat');
    });

    it('should return nodeData.title for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationService.createNodeTitle(fieldNode)).toEqual(fieldNode.title);
    });

    it('should return candidate label for unselected TargetAbstractFieldNodeData', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      expect(VisualizationService.createNodeTitle(abstractNode)).toEqual('(Cat | Dog)');
    });
  });

  describe('mapping through unselected target abstract wrapper', () => {
    let localTargetDocNode: TargetDocumentNodeData;
    let parentFieldNode: TargetFieldNodeData;
    let abstractField: ReturnType<typeof createMockAbstractField>;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      parentFieldNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
    });

    it('getOrCreateFieldItem should skip unselected abstract wrapper and create FieldItem under grandparent', () => {
      const abstractNode = new TargetAbstractFieldNodeData(parentFieldNode, abstractField);
      expect(abstractNode.abstractField).toBeUndefined();

      const candidateField = abstractField.fields[0];
      const candidateNode = new TargetFieldNodeData(abstractNode, candidateField);

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, candidateNode);

      const parentItem = tree.children[0] as FieldItem;
      expect(parentItem).toBeInstanceOf(FieldItem);
      expect(parentItem.field).toBe(parentFieldNode.field);
      expect(parentItem.children.some((c) => c instanceof FieldItem && c.field === abstractField)).toBe(false);
      const candidateItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === candidateField,
      ) as FieldItem;
      expect(candidateItem).toBeDefined();
      expect(candidateItem.field.name).toEqual('Cat');
    });

    it('generateNonDocumentNodeDataChildren should find mappings for fields inside unselected abstract wrapper', () => {
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      const abstractNode = new TargetAbstractFieldNodeData(parentFieldNode, abstractField);
      const candidateField = abstractField.fields[0];
      const candidateNode = new TargetFieldNodeData(abstractNode, candidateField);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, candidateNode);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const freshParentNode = new TargetFieldNodeData(
        freshTargetDocNode,
        freshParentField as (typeof targetDoc.fields)[0],
      );
      freshParentNode.mapping = tree.children[0] as FieldItem;

      const freshAbstractNode = new TargetAbstractFieldNodeData(freshParentNode, abstractField);
      const abstractChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshAbstractNode);

      const catNode = abstractChildren.find((c) => c.title === 'Cat');
      expect(catNode).toBeDefined();
      expect(catNode).toBeInstanceOf(FieldItemNodeData);
    });
  });

  describe('nested unselected target abstract wrappers', () => {
    it('should walk up through nested unselected abstract wrappers to find mapping ancestor', () => {
      const innerAbstractField = createMockAbstractField([{ name: 'Kitten' }, { name: 'Puppy' }]);
      const outerAbstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [outerAbstractField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);

      const outerAbstractNode = new TargetAbstractFieldNodeData(parentNode, outerAbstractField);
      const innerAbstractNode = new TargetAbstractFieldNodeData(outerAbstractNode, innerAbstractField);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(innerAbstractNode);
      expect(children.length).toEqual(2);
      expect(children[0].title).toEqual('Kitten');
      expect(children[1].title).toEqual('Puppy');
    });

    it('should walk up through mixed wrapper kinds (abstract inside choice) to find mapping ancestor', () => {
      const abstractField = createMockAbstractField([{ name: 'Kitten' }, { name: 'Puppy' }]);
      const baseField = sourceDoc.fields[0];
      const choiceField = {
        ...baseField,
        name: '__choice__',
        displayName: '__choice__',
        wrapperKind: 'choice' as const,
        selectedMemberIndex: undefined,
        fields: [abstractField],
      } as unknown as typeof baseField;
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);

      const choiceNode = new TargetChoiceFieldNodeData(parentNode, choiceField);
      const abstractNode = new TargetAbstractFieldNodeData(choiceNode, abstractField);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children.length).toEqual(2);
      expect(children[0].title).toEqual('Kitten');
      expect(children[1].title).toEqual('Puppy');
    });
  });

  describe('mapping through selected target abstract wrapper', () => {
    it('engageMapping to a selected abstract candidate creates FieldItem for the candidate', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], 0);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as TargetAbstractFieldNodeData;
      expect(selectedNode.abstractField).toBeDefined();

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, selectedNode);

      const parentItem = tree.children[0];
      expect(parentItem).toBeInstanceOf(FieldItem);
      const candidateItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'Cat',
      ) as FieldItem;
      expect(candidateItem).toBeDefined();
    });

    it('re-rendered tree generates children for a mapped selected abstract candidate', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat', children: [{ name: 'catName' }] }, { name: 'Dog' }],
        0,
      );
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as TargetAbstractFieldNodeData;

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);
      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, selectedNode);

      const freshDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentNode = new FieldItemNodeData(freshDocNode, tree.children[0] as FieldItem);
      freshParentNode.field = {
        ...freshParentNode.field,
        fields: [abstractField],
      } as typeof freshParentNode.field;

      const freshAbstractNode = new TargetAbstractFieldNodeData(freshParentNode, abstractField.fields[0]);
      freshAbstractNode.abstractField = abstractField;
      freshAbstractNode.mapping = (tree.children[0] as FieldItem).children.find(
        (c) => c instanceof FieldItem && c.field.name === 'Cat',
      ) as FieldItem;

  const candidateChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshAbstractNode);
  expect(candidateChildren.map((c) => c.title)).toEqual(['catName']);
  });
  });
});

describe('choice-selected abstract wrapper rendering', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let tree: MappingTree;

  function createMockAbstractField(
    candidates: { name: string; children?: { name: string }[] }[],
    selectedMemberIndex?: number,
  ) {
    const baseField = sourceDoc.fields[0];
    const candidateFields = candidates.map((c) => ({
      ...baseField,
      name: c.name,
      displayName: c.name,
      fields: (c.children ?? []).map((child) => ({
        ...baseField,
        name: child.name,
        displayName: child.name,
        fields: [],
      })),
    }));
    return {
      ...baseField,
      name: 'AbstractElement',
      displayName: 'AbstractElement',
      wrapperKind: 'abstract' as const,
      selectedMemberIndex,
      fields: candidateFields,
    } as unknown as typeof baseField;
  }

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  });

  it('should create AbstractFieldNodeData when a choice selects an abstract wrapper member (source)', () => {
    const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
    const baseField = sourceDoc.fields[0];
    const choiceField = {
      ...baseField,
      name: '__choice__',
      displayName: '__choice__',
      wrapperKind: 'choice' as const,
      selectedMemberIndex: 0,
      fields: [abstractField],
    } as unknown as typeof baseField;
    const parentField = {
      ...sourceDoc.fields[0],
      fields: [choiceField],
    };
    const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
    const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);

    expect(children.length).toEqual(1);
    expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
    const abstractNode = children[0] as AbstractFieldNodeData;
    expect(abstractNode.abstractField).toBe(abstractField);
    expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
  });

  it('should create TargetAbstractFieldNodeData when a choice selects an abstract wrapper member (target)', () => {
    const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
    const baseField = targetDoc.fields[0];
    const choiceField = {
      ...baseField,
      name: '__choice__',
      displayName: '__choice__',
      wrapperKind: 'choice' as const,
      selectedMemberIndex: 0,
      fields: [abstractField],
    } as unknown as typeof baseField;
    const parentField = {
      ...targetDoc.fields[0],
      fields: [choiceField],
    };
    const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
    const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);

    expect(children.length).toEqual(1);
    expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
    const abstractNode = children[0] as TargetAbstractFieldNodeData;
    expect(abstractNode.abstractField).toBe(abstractField);
    expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
  });

  it('should expand abstract candidates as children when choice-selected abstract node is expanded', () => {
    const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
    const baseField = sourceDoc.fields[0];
    const choiceField = {
      ...baseField,
      name: '__choice__',
      displayName: '__choice__',
      wrapperKind: 'choice' as const,
      selectedMemberIndex: 0,
      fields: [abstractField],
    } as unknown as typeof baseField;
    const parentField = {
      ...sourceDoc.fields[0],
      fields: [choiceField],
    };
    const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
    const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);

    const abstractNode = children[0] as AbstractFieldNodeData;
    expect(VisualizationService.hasChildren(abstractNode)).toBe(true);
    const abstractChildren = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
    const childNames = abstractChildren.map((c) => c.title);
    expect(childNames).toContain('Cat');
    expect(childNames).toContain('Dog');
  });
});
