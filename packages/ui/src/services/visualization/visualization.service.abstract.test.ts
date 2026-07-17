import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import { FieldItem, ForEachItem, IfItem, MappingTree } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../../models/datamapper/visualization';
import { getFieldSubstitutionXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { QName } from '../../xml-schema-ts/QName';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingService } from '../mapping/mapping.service';
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
    selectedMemberQName?: QName,
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
      selectedMemberQName,
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
      expect(children).toHaveLength(1);
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
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
    });

    it('should create AbstractFieldNodeData with selected candidate for source abstract fields', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
      expect(children[0].title).toBe('Cat');
    });

    it('should create TargetAbstractFieldNodeData with selected candidate for target abstract fields', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }],
        new QName('io.kaoto.datamapper.poc.test', 'Dog'),
      );
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new TargetFieldNodeData(targetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
      expect(children[0].title).toBe('Dog');
    });

    it('should still report isAbstractField for selected abstract candidates', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(VisualizationUtilService.isAbstractField(children[0])).toBe(true);
    });

    it('should set abstractField reference for selected abstract candidates', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const abstractNode = children[0] as AbstractFieldNodeData;
      expect(abstractNode.abstractField).toBe(abstractField);
    });

    it('should use abstract field itself when selectedMemberQName matches no candidate', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], new QName('', 'nonexistent'));
      const parentField = {
        ...sourceDoc.fields[0],
        fields: [abstractField],
      };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(AbstractFieldNodeData);
    });
  });

  describe('generateNonDocumentNodeDataChildren for abstract nodes', () => {
    it('should expand all abstract candidates as children', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children).toHaveLength(2);
      expect(children[0].title).toBe('Cat');
      expect(children[1].title).toBe('Dog');
    });

    it('should fall back to all candidates when selectedMemberQName matches no candidate', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }], new QName('', 'nonexistent'));
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children).toHaveLength(2);
      expect(children[0].title).toBe('Cat');
      expect(children[1].title).toBe('Dog');
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
        abstractAnimalField.selectedMemberQName = new QName('http://www.example.com/SUBSTITUTION', 'Cat');

        const docNode = new DocumentNodeData(document);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const zooNode = docChildren[0];
        const zooChildren = VisualizationService.generateNonDocumentNodeDataChildren(zooNode);

        const selectedNode = zooChildren.find((c) => VisualizationUtilService.isAbstractField(c))!;
        expect(selectedNode).toBeInstanceOf(AbstractFieldNodeData);
        expect((selectedNode as AbstractFieldNodeData).abstractField).toBe(abstractAnimalField);
        expect(selectedNode.title).toBe('Cat');
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
        abstractAnimalField.selectedMemberQName = new QName('http://www.example.com/SUBSTITUTION', 'Cat');

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
        abstractAnimalField.selectedMemberQName = new QName('http://www.example.com/SUBSTITUTION', 'Cat');

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
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toBe('(Cat | Dog | Fish)');
    });

    it('should return "(no candidates)" for abstract with no candidates', () => {
      const abstractField = createMockAbstractField([]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toBe('(no candidates)');
    });

    it('should truncate long candidate lists showing first 3 and count', () => {
      const candidates = Array.from({ length: 10 }, (_, i) => ({ name: `animal${i}` }));
      const abstractField = createMockAbstractField(candidates);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toBe('(animal0 | animal1 | animal2 | +7 more)');
    });

    it('should handle single candidate without truncation', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toBe('(Cat)');
    });

    it('should handle exactly 3 candidates without truncation', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.getAbstractMemberLabel(abstractNode)).toBe('(Cat | Dog | Fish)');
    });
  });

  describe('createNodeTitle', () => {
    it('should return candidate label for unselected abstract wrapper (no abstractField)', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationService.createNodeTitle(abstractNode)).toBe('(Cat | Dog)');
    });

    it('should return nodeData.title for selected abstract candidate (abstractField set)', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      const parentField = { ...sourceDoc.fields[0], fields: [abstractField] };
      const parentNode = new FieldNodeData(sourceDocNode, parentField as (typeof sourceDoc.fields)[0]);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(parentNode);
      const selectedNode = children[0] as AbstractFieldNodeData;
      expect(selectedNode.abstractField).toBeDefined();
      expect(VisualizationService.createNodeTitle(selectedNode)).toBe('Cat');
    });

    it('should return nodeData.title for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationService.createNodeTitle(fieldNode)).toEqual(fieldNode.title);
    });

    it('should return candidate label for unselected TargetAbstractFieldNodeData', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      expect(VisualizationService.createNodeTitle(abstractNode)).toBe('(Cat | Dog)');
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
      expect(candidateItem.field.name).toBe('Cat');
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
    it('unconfigured nested abstract wrappers should hide children', () => {
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
      expect(children).toHaveLength(0);
    });

    it('unconfigured abstract inside choice should hide children', () => {
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
      expect(children).toHaveLength(0);
    });

    it('should not open unconfigured wrapper when sibling field has a FieldItem', () => {
      const abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const siblingField = {
        ...targetDoc.fields[0],
        name: 'siblingElement',
        displayName: 'siblingElement',
        fields: [],
      };
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField, siblingField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);

      const siblingFieldItem = new FieldItem(tree, siblingField as unknown as (typeof targetDoc.fields)[0]);
      const parentFieldItem = new FieldItem(tree, parentField as (typeof targetDoc.fields)[0]);
      parentFieldItem.children.push(siblingFieldItem);
      parentNode.mapping = parentFieldItem;

      const abstractNode = new TargetAbstractFieldNodeData(parentNode, abstractField);

      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children).toHaveLength(0);
    });
  });

  describe('S11: maxOccurs>1 collection rendering at parent level', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;

    beforeEach(() => {
      abstractField = createMockAbstractField([
        { name: 'Cat', children: [{ name: 'catName' }] },
        { name: 'Dog' },
        { name: 'Fish' },
        { name: 'Kitten' },
      ]);
      abstractField.maxOccurs = 'unbounded';
    });

    function generateFreshParentChildren(localTree: MappingTree) {
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
      if (localTree.children.length > 0) {
        freshParentNode.mapping = localTree.children[0] as FieldItem;
      }
      return VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
    }

    it('maxOccurs>1 with one mapped member renders FieldItemNodeData + AddMappingNodeData at parent level', () => {
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const parentFieldItem = new FieldItem(tree, parentField as (typeof targetDoc.fields)[0]);
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      parentFieldItem.children.push(catFieldItem);
      tree.children.push(parentFieldItem);

      const children = generateFreshParentChildren(tree);
      expect(children).toHaveLength(2);
      expect(children[0]).toBeInstanceOf(FieldItemNodeData);
      expect(children[0].title).toBe('Cat');
      expect((children[0] as FieldItemNodeData).wrapperField).toBe(abstractField);
      expect(children[1]).toBeInstanceOf(AddMappingNodeData);
    });

    it('maxOccurs>1 with multiple mapped members renders only those + AddMappingNodeData', () => {
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const parentFieldItem = new FieldItem(tree, parentField as (typeof targetDoc.fields)[0]);
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      const fishFieldItem = new FieldItem(parentFieldItem, abstractField.fields[2]);
      parentFieldItem.children.push(catFieldItem, fishFieldItem);
      tree.children.push(parentFieldItem);

      const children = generateFreshParentChildren(tree);
      const childNames = children.filter((c) => c instanceof FieldItemNodeData).map((c) => c.title);
      expect(childNames).toContain('Cat');
      expect(childNames).toContain('Fish');
      expect(childNames).not.toContain('Dog');
      expect(childNames).not.toContain('Kitten');
      expect(children[children.length - 1]).toBeInstanceOf(AddMappingNodeData);
    });

    it('maxOccurs>1 with no mapped members renders bare wrapper (initial state)', () => {
      const children = generateFreshParentChildren(tree);
      expect(children).toHaveLength(1);
      expect(children[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
    });

    it('maxOccurs=1 without mapping should return wrapper node with no children (unconfigured target)', () => {
      abstractField.maxOccurs = 1;
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      const localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentFieldNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
      const parentChildren = VisualizationService.generateNonDocumentNodeDataChildren(parentFieldNode);
      expect(parentChildren).toHaveLength(1);
      expect(parentChildren[0]).toBeInstanceOf(TargetAbstractFieldNodeData);
      const abstractNode = parentChildren[0] as TargetAbstractFieldNodeData;
      const abstractChildren = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(abstractChildren).toHaveLength(0);
    });

    it('source-side maxOccurs>1 should still return all candidates', () => {
      const sourceAbstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }, { name: 'Fish' }]);
      sourceAbstractField.maxOccurs = 'unbounded';
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, sourceAbstractField);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(abstractNode);
      expect(children).toHaveLength(3);
      expect(children.map((c) => c.title)).toEqual(['Cat', 'Dog', 'Fish']);
    });
  });

  describe('mapping through selected target abstract wrapper', () => {
    it('engageMapping to a selected abstract candidate creates FieldItem for the candidate', () => {
      const abstractField = createMockAbstractField(
        [{ name: 'Cat' }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
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
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
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

  describe('maxOccurs>1 per-instance from the start', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField(
        [{ name: 'Cat', children: [{ name: 'catName' }] }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      abstractField.maxOccurs = 'unbounded';
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      parentFieldItem.children.push(catFieldItem);
      localTree.children.push(parentFieldItem);
    });

    it('should show per-instance FieldItems with wrapperField at parent level', () => {
      const duplicateFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      duplicateFieldItem.isUserCreated = true;
      parentFieldItem.children.push(duplicateFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const catChildren = children.filter((c) => c.title === 'Cat');
      expect(catChildren).toHaveLength(2);
      for (const child of catChildren) {
        expect(child).toBeInstanceOf(FieldItemNodeData);
        expect((child as FieldItemNodeData).wrapperField).toBe(abstractField);
      }
      expect(children[children.length - 1]).toBeInstanceOf(AddMappingNodeData);
    });
  });

  describe('wrapper-pointing FieldItem shown as unsubstituted instance', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField([{ name: 'Cat', children: [{ name: 'catName' }] }, { name: 'Dog' }]);
      abstractField.maxOccurs = 'unbounded';
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      localTree.children.push(parentFieldItem);
    });

    it('should show both substituted FieldItem and unsubstituted wrapper instance at parent level', () => {
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      parentFieldItem.children.push(catFieldItem);

      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const fieldItemChildren = children.filter((c) => c instanceof FieldItemNodeData);
      expect(fieldItemChildren).toHaveLength(2);

      const catChild = fieldItemChildren.find((c) => c.title === 'Cat');
      expect(catChild).toBeInstanceOf(FieldItemNodeData);
      expect((catChild as FieldItemNodeData).mapping.field.name).toBe('Cat');
      expect((catChild as FieldItemNodeData).wrapperField).toBe(abstractField);

      const wrapperChild = fieldItemChildren.find((c) => c.title === 'AbstractElement');
      expect(wrapperChild).toBeInstanceOf(FieldItemNodeData);
      expect((wrapperChild as FieldItemNodeData).mapping.field).toBe(abstractField);
      expect((wrapperChild as FieldItemNodeData).wrapperField).toBe(abstractField);

      expect(children[children.length - 1]).toBeInstanceOf(AddMappingNodeData);
    });

    it('unsubstituted instance should have parent field node as parent', () => {
      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const wrapperChild = children.find((c) => c instanceof FieldItemNodeData && c.field.wrapperKind === 'abstract');
      expect(wrapperChild).toBeDefined();
      expect((wrapperChild as FieldItemNodeData).parent).toBe(freshParentNode);
    });

    it('wrapper-pointing FieldItem appears alongside substituted members', () => {
      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const fieldItemChildren = children.filter((c) => c instanceof FieldItemNodeData);
      expect(fieldItemChildren).toHaveLength(1);
      expect((fieldItemChildren[0] as FieldItemNodeData).field).toBe(abstractField);
    });
  });

  describe('Bug regression: wrap-with-if on substituted abstract member', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField(
        [{ name: 'Cat', children: [{ name: 'catName' }] }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      parentFieldItem.children.push(catFieldItem);
      localTree.children.push(parentFieldItem);
    });

    it('should not produce ghost TargetAbstractFieldNodeData after wrapping a substituted member with if', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithIf(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const ghostNodes = children.filter((c) => c instanceof TargetAbstractFieldNodeData);
      expect(ghostNodes).toHaveLength(0);
    });

    it('FieldItemNodeData inside IfItem should have wrapperField set', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithIf(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const ifNode = children.find((c) => c instanceof MappingNodeData && c.mapping instanceof IfItem);
      expect(ifNode).toBeDefined();

      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(ifNode!);
      const catNode = ifChildren.find((c) => c instanceof FieldItemNodeData && c.title === 'Cat') as FieldItemNodeData;
      expect(catNode).toBeDefined();
      expect(catNode.wrapperField).toBe(abstractField);
      expect(VisualizationUtilService.isAbstractWrapperMember(catNode)).toBe(true);
    });
  });

  describe('Bug regression: duplicate on unsubstituted abstract wrapper', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField([
        { name: 'Cat', children: [{ name: 'catName' }] },
        { name: 'Dog' },
        { name: 'Fish' },
        { name: 'Kitten' },
      ]);
      abstractField.maxOccurs = 'unbounded';
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      localTree.children.push(parentFieldItem);
    });

    it('createNodeTitle should return candidate list label for unsubstituted FieldItemNodeData', () => {
      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const wrapperNode = children.find(
        (c) => c instanceof FieldItemNodeData && c.field.wrapperKind === 'abstract',
      ) as FieldItemNodeData;
      expect(wrapperNode).toBeDefined();
      expect(VisualizationService.createNodeTitle(wrapperNode)).toBe('(Cat | Dog | Fish | +1 more)');
    });

    it('createNodeTitle should return candidate list label for AddMappingNodeData with abstract wrapper field', () => {
      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const addNode = children.find((c) => c instanceof AddMappingNodeData) as AddMappingNodeData;
      expect(addNode).toBeDefined();
      expect(VisualizationService.createNodeTitle(addNode)).toBe('(Cat | Dog | Fish | +1 more)');
    });
  });

  describe('Bug regression: wrap-with-for-each on substituted abstract member (maxOccurs>1)', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField(
        [{ name: 'Cat', children: [{ name: 'catName' }] }, { name: 'Dog' }],
        new QName('io.kaoto.datamapper.poc.test', 'Cat'),
      );
      abstractField.maxOccurs = 'unbounded';
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      const catFieldItem = new FieldItem(parentFieldItem, abstractField.fields[0]);
      parentFieldItem.children.push(catFieldItem);
      localTree.children.push(parentFieldItem);
    });

    it('should not produce ghost TargetAbstractFieldNodeData after wrapping with for-each', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithForEach(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const ghostNodes = children.filter((c) => c instanceof TargetAbstractFieldNodeData);
      expect(ghostNodes).toHaveLength(0);
    });

    it('should show MappingNodeData for ForEachItem', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithForEach(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const forEachNode = children.find((c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem);
      expect(forEachNode).toBeDefined();
    });

    it('should show AddMappingNodeData as last child', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithForEach(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      expect(children[children.length - 1]).toBeInstanceOf(AddMappingNodeData);
    });

    it('FieldItemNodeData inside ForEachItem should have wrapperField set', () => {
      const catFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithForEach(catFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const forEachNode = children.find((c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem);
      expect(forEachNode).toBeDefined();

      const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode!);
      const catNode = forEachChildren.find(
        (c) => c instanceof FieldItemNodeData && c.title === 'Cat',
      ) as FieldItemNodeData;
      expect(catNode).toBeDefined();
      expect(catNode.wrapperField).toBe(abstractField);
      expect(VisualizationUtilService.isAbstractWrapperMember(catNode)).toBe(true);
    });
  });

  describe('Bug regression: wrap-with-if on unselected abstract wrapper (maxOccurs=1)', () => {
    let abstractField: ReturnType<typeof createMockAbstractField>;
    let parentFieldItem: FieldItem;
    let localTree: MappingTree;

    beforeEach(() => {
      abstractField = createMockAbstractField([{ name: 'Cat' }, { name: 'Dog' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [abstractField],
      };
      localTree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
      parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
      const wrapperFieldItem = new FieldItem(parentFieldItem, abstractField);
      parentFieldItem.children.push(wrapperFieldItem);
      localTree.children.push(parentFieldItem);
    });

    it('should produce a single IfItem MappingNodeData and no TargetAbstractFieldNodeData', () => {
      const wrapperFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithIf(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const ghostNodes = children.filter((c) => c instanceof TargetAbstractFieldNodeData);
      expect(ghostNodes).toHaveLength(0);

      const ifNodes = children.filter((c) => c instanceof MappingNodeData && c.mapping instanceof IfItem);
      expect(ifNodes).toHaveLength(1);
    });

    it('IfItem children should contain unselected abstract wrapper as leaf FieldItemNodeData', () => {
      const wrapperFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithIf(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const ifNode = children.find(
        (c) => c instanceof MappingNodeData && c.mapping instanceof IfItem,
      ) as MappingNodeData;
      expect(ifNode).toBeDefined();

      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(ifNode);
      const wrapperNode = ifChildren.find(
        (c) => c instanceof FieldItemNodeData && c.field === abstractField,
      ) as FieldItemNodeData;
      expect(wrapperNode).toBeDefined();
      expect(wrapperNode.wrapperField).toBe(abstractField);
      expect(VisualizationService.createNodeTitle(wrapperNode)).toBe('(Cat | Dog)');

      const leafChildren = VisualizationService.generateNonDocumentNodeDataChildren(wrapperNode);
      expect(leafChildren).toHaveLength(0);
    });

    it('should not show AddMappingNodeData for maxOccurs=1', () => {
      const wrapperFieldItem = parentFieldItem.children[0] as FieldItem;
      MappingService.wrapWithIf(wrapperFieldItem);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
      const freshParentNode = new TargetFieldNodeData(freshTargetDocNode, parentFieldItem.field);
      freshParentNode.mapping = parentFieldItem;

      const children = VisualizationService.generateNonDocumentNodeDataChildren(freshParentNode);
      const addNodes = children.filter((c) => c instanceof AddMappingNodeData);
      expect(addNodes).toHaveLength(0);
    });
  });
});
