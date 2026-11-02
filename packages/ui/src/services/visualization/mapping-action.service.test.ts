import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingItem,
  MappingTree,
  OtherwiseItem,
  UnknownMappingItem,
  ValueOfSelector,
  ValueOfType,
  ValueSelector,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import { Types } from '../../models/datamapper/types';
import {
  AddMappingNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  MappingNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import {
  getConditionalMappingsToShipOrderXslt,
  getShipOrderToShipOrderXslt,
  getShipOrderValueOfInContainerXslt,
  getUnknownApplyTemplateXslt,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { XmlSchemaDocument, XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { MappingService } from '../mapping/mapping.service';
import { MappingSerializerService } from '../mapping/mapping-serializer.service';
import { MappingActionService } from './mapping-action.service';
import { MappingActionRegistryService } from './mapping-action-registry.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let paramsMap: Map<string, IDocument>;
  let tree: MappingTree;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    paramsMap = TestUtil.createParameterMap();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  });

  describe('without pre-populated mappings', () => {
    beforeEach(() => {
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('applyValueOfSelector()', () => {
      it('should apply value-of selector on a container field', () => {
        expect(tree.children).toHaveLength(0);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        MappingActionService.applyValueOfSelector(docChildren[0] as TargetNodeData);

        expect(tree.children).toHaveLength(1);
        expect(tree.children[0].children[0] instanceof ValueSelector).toBeTruthy();
      });

      it('should apply value-of selector on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyValueOfSelector(targetDocNode);

        expect(VisualizationService.hasChildren(targetDocNode)).toBeFalsy();
        const targetDocChildren = VisualizationService.generatePrimitiveDocumentChildren(targetDocNode);
        expect(targetDocChildren).toHaveLength(0);
      });

      it('should apply value-of when copy-of already exists', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        MappingActionService.applyCopyOfSelector(docChildren[0] as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        MappingActionService.applyValueOfSelector(updatedDocChildren[0] as TargetNodeData);

        const shipOrderFieldItem = tree.children[0] as FieldItem;
        expect(shipOrderFieldItem.children.filter((child) => child instanceof CopyOfSelector)).toHaveLength(1);
        expect(shipOrderFieldItem.children.filter((child) => child instanceof ValueOfSelector)).toHaveLength(1);
        const valueOfSelector = shipOrderFieldItem.children.find(
          (child) => child instanceof ValueOfSelector,
        ) as ValueOfSelector;
        expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(valueOfSelector.nodePath.toString());
      });

      it('should create VALUE ValueSelector for element field', () => {
        expect(tree.children).toHaveLength(0);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[1].title).toBe('OrderPerson');
        MappingActionService.applyValueOfSelector(shipOrderChildren[1] as TargetNodeData);

        const shipOrderFI = tree.children[0] as FieldItem;
        const orderPersonFI = shipOrderFI.children[0] as FieldItem;
        expect(orderPersonFI.children).toHaveLength(1);
        const vs = orderPersonFI.children[0] as ValueOfSelector;
        expect(vs).toBeInstanceOf(ValueOfSelector);
        expect(vs.valueType).toBe(ValueOfType.VALUE);
      });

      it('should create ATTRIBUTE ValueSelector for attribute field', () => {
        expect(tree.children).toHaveLength(0);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        expect(shipOrderChildren[0].title).toBe('OrderId');
        MappingActionService.applyValueOfSelector(shipOrderChildren[0] as TargetNodeData);

        const shipOrderFI = tree.children[0] as FieldItem;
        const orderIdFI = shipOrderFI.children[0] as FieldItem;
        expect(orderIdFI.children).toHaveLength(1);
        const vs = orderIdFI.children[0] as ValueOfSelector;
        expect(vs).toBeInstanceOf(ValueOfSelector);
        expect(vs.valueType).toBe(ValueOfType.ATTRIBUTE);
      });

      it('should prevent duplicate VALUE ValueSelector', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyValueOfSelector(shipOrderChildren[1] as TargetNodeData);
        MappingActionService.applyValueOfSelector(shipOrderChildren[1] as TargetNodeData);

        const shipOrderFI = tree.children[0] as FieldItem;
        const orderPersonFI = shipOrderFI.children[0] as FieldItem;
        const valueSelectors = orderPersonFI.children.filter((c) => c instanceof ValueOfSelector);
        expect(valueSelectors).toHaveLength(1);
      });
    });

    describe('applyCopyOfSelector()', () => {
      it('should create CONTAINER_NODE ValueSelector', () => {
        expect(tree.children).toHaveLength(0);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyCopyOfSelector(shipOrderChildren[0] as TargetNodeData);

        const shipOrderFI = tree.children[0] as FieldItem;
        const orderIdFI = shipOrderFI.children[0] as FieldItem;
        expect(orderIdFI.children).toHaveLength(1);
        const vs = orderIdFI.children[0] as CopyOfSelector;
        expect(vs).toBeInstanceOf(CopyOfSelector);
        expect(vs.valueType).toBe(CopyOfType.CONTAINER_NODE);
      });

      it('should allow multiple CONTAINER_NODE ValueSelectors', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyCopyOfSelector(shipOrderChildren[1] as TargetNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const orderPersonNodeData = updatedShipOrderChildren.find(
          (c) => c.title === 'OrderPerson',
        ) as FieldItemNodeData;
        MappingActionService.applyCopyOfSelector(orderPersonNodeData);

        const shipOrderFI = tree.children[0] as FieldItem;
        const orderPersonFI = shipOrderFI.children[0] as FieldItem;
        const containerSelectors = orderPersonFI.children.filter(
          (c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER_NODE,
        );
        expect(containerSelectors).toHaveLength(2);
      });
    });

    describe('hasValueOfSelector()', () => {
      it('should return false when no ValueSelector exists', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        expect(MappingActionService.hasValueOfSelector(docChildren[0] as TargetNodeData)).toBe(false);
      });

      it('should return true when VALUE ValueSelector exists', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyValueOfSelector(shipOrderChildren[0] as TargetNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        expect(MappingActionService.hasValueOfSelector(updatedShipOrderChildren[0] as TargetNodeData)).toBe(true);
      });

      it('should return false when only CONTAINER ValueSelector exists', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyCopyOfSelector(shipOrderChildren[0] as TargetNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        expect(MappingActionService.hasValueOfSelector(updatedShipOrderChildren[0] as TargetNodeData)).toBe(false);
      });
    });

    describe('getMappingContextMenuItems() copy-of', () => {
      it('should include CopyOfSelector in context menu items', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(
          shipOrderChildren[0] as TargetNodeData,
        );
        const copyOfAction = menuItems.find((item) => item.key === MappingActionKind.CopyOfSelector);
        expect(copyOfAction).toBeDefined();
        expect(copyOfAction!.getLabel(shipOrderChildren[0] as TargetNodeData)).toBe('Add copy selector (copy-of)');
        expect(copyOfAction!.testId).toBe('transformation-actions-copy-of');
      });

      it('should include renamed ValueSelector label in context menu items', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(
          shipOrderChildren[0] as TargetNodeData,
        );
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction).toBeDefined();
        expect(valueSelectorAction!.getLabel(shipOrderChildren[0] as TargetNodeData)).toBe(
          'Add value selector (value-of)',
        );
      });

      it('should disable ValueSelector when value-of already exists but not CopyOfSelector', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyValueOfSelector(shipOrderChildren[0] as TargetNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(
          updatedShipOrderChildren[0] as TargetNodeData,
        );
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction!.isDisabled!(updatedShipOrderChildren[0] as TargetNodeData)).toBe(true);
        // OrderId is a leaf field — copy-of should be disabled for it
        const copyOfAction = menuItems.find((item) => item.key === MappingActionKind.CopyOfSelector);
        expect(copyOfAction!.isDisabled!(updatedShipOrderChildren[0] as TargetNodeData)).toBe(true);
      });

      it('should NOT disable ValueSelector when only copy-of exists', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        MappingActionService.applyCopyOfSelector(shipOrderChildren[0] as TargetNodeData);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(
          updatedShipOrderChildren[0] as TargetNodeData,
        );
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction!.isDisabled!(updatedShipOrderChildren[0] as TargetNodeData)).toBe(false);
      });

      it('should not disable CopyOfSelector for a container field', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        // ShipTo is a container field (index 2: OrderId attr, OrderPerson, ShipTo, ...)
        const shipToNode = shipOrderChildren.find((c) => c.title === 'ShipTo') as TargetNodeData;
        expect(shipToNode).toBeDefined();
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(shipToNode);
        const copyOfAction = menuItems.find((item) => item.key === MappingActionKind.CopyOfSelector);
        expect(copyOfAction).toBeDefined();
        expect(copyOfAction!.isDisabled!(shipToNode)).toBe(false);
      });

      it('should disable CopyOfSelector for a leaf field (no children)', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        // OrderPerson is a leaf string field
        const orderPersonNode = shipOrderChildren.find((c) => c.title === 'OrderPerson') as TargetNodeData;
        expect(orderPersonNode).toBeDefined();
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(orderPersonNode);
        const copyOfAction = menuItems.find((item) => item.key === MappingActionKind.CopyOfSelector);
        expect(copyOfAction).toBeDefined();
        expect(copyOfAction!.isDisabled!(orderPersonNode)).toBe(true);
      });

      it('should hide CopyOfSelector for a JSON target document', () => {
        const jsonTargetDoc = TestUtil.createJSONTargetOrderDoc();
        const jsonTree = new MappingTree(
          jsonTargetDoc.documentType,
          jsonTargetDoc.documentId,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        const jsonTargetDocNode = new TargetDocumentNodeData(jsonTargetDoc, jsonTree);
        const jsonDocChildren = VisualizationService.generateStructuredDocumentChildren(jsonTargetDocNode);
        const jsonShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(jsonDocChildren[0]);
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(
          jsonShipOrderChildren[0] as TargetNodeData,
        );
        const copyOfAction = menuItems.find((item) => item.key === MappingActionKind.CopyOfSelector);
        expect(copyOfAction).toBeUndefined();
      });
    });

    describe('ValueSelector action availability', () => {
      const childrenOf = (row: NodeData) => VisualizationService.generateNonDocumentNodeDataChildren(row);

      const rootRows = (doc: IDocument, mappingTree: MappingTree) =>
        VisualizationService.generateStructuredDocumentChildren(new TargetDocumentNodeData(doc, mappingTree));

      const findRow = (rows: NodeData[], title: string): TargetNodeData => {
        const row = rows.find((r) => r.title === title);
        if (!row) throw new Error(`Row '${title}' not found`);
        return row as TargetNodeData;
      };

      const findFieldRow = (rows: NodeData[], title: string): TargetFieldNodeData => {
        const row = rows.find((r) => r.title === title);
        if (!(row instanceof TargetFieldNodeData)) throw new Error(`Unmapped field row '${title}' not found`);
        return row;
      };

      const findJsonRow = (rows: NodeData[], key: string): TargetFieldNodeData | FieldItemNodeData => {
        const row = rows.find(
          (r) =>
            (r instanceof TargetFieldNodeData || r instanceof FieldItemNodeData) &&
            'key' in r.field &&
            r.field.key === key,
        );
        if (!(row instanceof TargetFieldNodeData || row instanceof FieldItemNodeData)) {
          throw new Error(`JSON row '${key}' not found`);
        }
        return row;
      };

      const findMappingRow = (
        rows: NodeData[],
        type: abstract new (...args: never[]) => MappingItem,
      ): MappingNodeData => {
        const row = rows.find((r) => r instanceof MappingNodeData && r.mapping instanceof type);
        if (!(row instanceof MappingNodeData)) throw new Error('Mapping row not found');
        return row;
      };

      const expectActionAllowed = (row: TargetNodeData, kind: MappingActionKind, allowed: boolean) => {
        expect(MappingActionRegistryService.getAllowedActions(row).includes(kind)).toBe(allowed);
        expect(MappingActionRegistryService.getMappingContextMenuItems(row).some((item) => item.key === kind)).toBe(
          allowed,
        );
      };

      const expectValueSelectorAllowed = (row: TargetNodeData, allowed: boolean) => {
        expectActionAllowed(row, MappingActionKind.ValueSelector, allowed);
      };

      it('should allow ValueSelector for a leaf (no-children) field', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderPersonNode = shipOrderChildren.find((c) => c.title === 'OrderPerson') as TargetNodeData;
        expect(orderPersonNode).toBeDefined();
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(orderPersonNode);
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction).toBeDefined();
      });

      it('should allow ValueSelector for an attribute field', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const orderIdNode = shipOrderChildren.find((c) => c.title === 'OrderId') as TargetNodeData;
        expect(orderIdNode).toBeDefined();
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(orderIdNode);
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction).toBeDefined();
      });

      it('should disallow ValueSelector for a container field with element children (XML)', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const shipToNode = shipOrderChildren.find((c) => c.title === 'ShipTo') as TargetNodeData;
        expect(shipToNode).toBeDefined();
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(shipToNode);
        const valueSelectorAction = menuItems.find((item) => item.key === MappingActionKind.ValueSelector);
        expect(valueSelectorAction).toBeUndefined();
      });

      it('should disallow ValueSelector for a container field with element children (XML) via getAllowedActions', () => {
        const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const shipToNode = shipOrderChildren.find((c) => c.title === 'ShipTo') as TargetNodeData;
        expect(shipToNode).toBeDefined();
        expect(MappingActionRegistryService.getAllowedActions(shipToNode)).not.toContain(
          MappingActionKind.ValueSelector,
        );
      });

      it('should disallow ValueSelector for JSON container fields', () => {
        const jsonTargetDoc = TestUtil.createJSONTargetOrderDoc();
        const jsonTree = new MappingTree(
          jsonTargetDoc.documentType,
          jsonTargetDoc.documentId,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        const jsonTargetDocNode = new TargetDocumentNodeData(jsonTargetDoc, jsonTree);
        const jsonDocChildren = VisualizationService.generateStructuredDocumentChildren(jsonTargetDocNode);
        // jsonDocChildren[0].title === 'map' (root JSON object)
        const jsonRootChildren = VisualizationService.generateNonDocumentNodeDataChildren(jsonDocChildren[0]);
        // ShipTo in JSON is 'map [@key = ShipTo]' (a container with children)
        const shipToNode = jsonRootChildren.find((c) => c.title === 'map [@key = ShipTo]') as TargetNodeData;
        expect(shipToNode).toBeDefined();
        expect(MappingActionRegistryService.getAllowedActions(shipToNode)).not.toContain(
          MappingActionKind.ValueSelector,
        );
      });

      it('should allow ValueSelector for JSON leaf fields', () => {
        const jsonTargetDoc = TestUtil.createJSONTargetOrderDoc();
        const jsonTree = new MappingTree(
          jsonTargetDoc.documentType,
          jsonTargetDoc.documentId,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        const jsonTargetDocNode = new TargetDocumentNodeData(jsonTargetDoc, jsonTree);
        const jsonDocChildren = VisualizationService.generateStructuredDocumentChildren(jsonTargetDocNode);
        // jsonDocChildren[0].title === 'map' (root JSON object)
        const jsonRootChildren = VisualizationService.generateNonDocumentNodeDataChildren(jsonDocChildren[0]);
        // OrderPerson in JSON is 'string [@key = OrderPerson]' (leaf field)
        const orderPersonNode = jsonRootChildren.find(
          (c) => c.title === 'string [@key = OrderPerson]',
        ) as TargetNodeData;
        expect(orderPersonNode).toBeDefined();
        expect(MappingActionRegistryService.getAllowedActions(orderPersonNode)).toContain(
          MappingActionKind.ValueSelector,
        );
      });

      it('should allow ValueSelector on unexpanded attribute-only simpleContent rows, before and after expanding them', () => {
        const extensionDoc = TestUtil.createExtensionSimpleDoc();
        const extensionTree = new MappingTree(
          extensionDoc.documentType,
          extensionDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const productRows = childrenOf(rootRows(extensionDoc, extensionTree)[0]);

        for (const title of ['name', 'price']) {
          const row = findFieldRow(productRows, title);
          expect(row.field.fields).toHaveLength(0);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(1);
          expectValueSelectorAllowed(row, true);
          expect(row.field.fields).toHaveLength(0);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(1);

          childrenOf(row);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(0);
          expectValueSelectorAllowed(row, true);
        }
      });

      it('should judge named-type rows beyond the parse frontier the same before and after expanding them', () => {
        const frontierDoc = TestUtil.createNamedTypesBeyondFrontierDoc();
        const frontierTree = new MappingTree(
          frontierDoc.documentType,
          frontierDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const customerRows = childrenOf(rootRows(frontierDoc, frontierTree)[0]);
        const detailsRows = childrenOf(findFieldRow(customerRows, 'Details'));
        const expected: [string, boolean][] = [
          ['Address', false],
          ['BillingAddress', false],
          ['Balance', true],
          ['Price', true],
        ];

        for (const [title, allowed] of expected) {
          const row = findFieldRow(detailsRows, title);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(1);
          expectValueSelectorAllowed(row, allowed);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(1);

          childrenOf(row);
          expect(row.field.namedTypeFragmentRefs).toHaveLength(0);
          expectValueSelectorAllowed(row, allowed);
        }
      });

      it('should judge JSON rows by their type', () => {
        const jsonDoc = TestUtil.createFieldsBeyondFrontierJsonDoc();
        const jsonTree = new MappingTree(jsonDoc.documentType, jsonDoc.documentId, DocumentDefinitionType.JSON_SCHEMA);
        const detailsRows = childrenOf(findJsonRow(childrenOf(rootRows(jsonDoc, jsonTree)[0]), 'details'));

        expectValueSelectorAllowed(findJsonRow(detailsRows, 'metadata'), false);
        expectValueSelectorAllowed(findJsonRow(detailsRows, 'tags'), false);
        expectValueSelectorAllowed(findJsonRow(detailsRows, 'code'), true);
        expectValueSelectorAllowed(findJsonRow(detailsRows, 'note'), true);

        const shipOrderJsonDoc = TestUtil.createJSONTargetOrderDoc();
        const shipOrderJsonTree = new MappingTree(
          shipOrderJsonDoc.documentType,
          shipOrderJsonDoc.documentId,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        const shipOrderJsonRows = childrenOf(rootRows(shipOrderJsonDoc, shipOrderJsonTree)[0]);
        expectValueSelectorAllowed(findJsonRow(shipOrderJsonRows, 'Item'), false);
      });

      it('should not offer a second value-of on a container that already holds one, and keep the existing one deletable', () => {
        MappingSerializerService.deserialize(getShipOrderValueOfInContainerXslt(), targetDoc, tree, paramsMap);
        const shipToRow = childrenOf(rootRows(targetDoc, tree)[0]).find((r) => r.title === 'ShipTo');
        if (!(shipToRow instanceof FieldItemNodeData)) throw new Error('Mapped ShipTo row not found');

        expectValueSelectorAllowed(shipToRow, false);
        const valueOfRow = findMappingRow(childrenOf(shipToRow), ValueOfSelector);
        expect(MappingActionRegistryService.getAllowedActions(valueOfRow)).toContain(MappingActionKind.Delete);
      });

      describe('condition rows', () => {
        const shipOrderRows = () => childrenOf(rootRows(targetDoc, tree)[0]);

        it('should judge an inner "if" by the field it sits in', () => {
          MappingActionService.applyInnerIf(findFieldRow(shipOrderRows(), 'ShipTo'));
          MappingActionService.applyInnerIf(findFieldRow(shipOrderRows(), 'OrderPerson'));

          const rows = shipOrderRows();
          expectValueSelectorAllowed(findMappingRow(childrenOf(findRow(rows, 'ShipTo')), IfItem), false);
          expectValueSelectorAllowed(findMappingRow(childrenOf(findRow(rows, 'OrderPerson')), IfItem), true);
        });

        it('should judge "when" and "otherwise" by the field the "choose" sits in', () => {
          const nameRow = findFieldRow(childrenOf(findFieldRow(shipOrderRows(), 'ShipTo')), 'Name');
          MappingActionService.applyChooseWhenOtherwise(nameRow);

          const chooseRow = findMappingRow(childrenOf(findRow(shipOrderRows(), 'ShipTo')), ChooseItem);
          const chooseChildren = childrenOf(chooseRow);
          expectValueSelectorAllowed(findMappingRow(chooseChildren, WhenItem), false);
          expectValueSelectorAllowed(findMappingRow(chooseChildren, OtherwiseItem), false);
        });

        it('should judge an "if" inside a loop by the field the loop writes into', () => {
          MappingActionService.applyForEach(findFieldRow(shipOrderRows(), 'Item'));
          const forEachRow = findMappingRow(shipOrderRows(), ForEachItem);
          MappingActionService.applyIf(findRow(childrenOf(forEachRow), 'Item'));

          const ifRow = findMappingRow(childrenOf(findMappingRow(shipOrderRows(), ForEachItem)), IfItem);
          expectValueSelectorAllowed(ifRow, false);
        });

        it('should disallow ValueSelector on an "if" at the root of a structured document', () => {
          MappingActionService.applyIf(findFieldRow(rootRows(targetDoc, tree), 'ShipOrder'));

          expectValueSelectorAllowed(findMappingRow(rootRows(targetDoc, tree), IfItem), false);
        });

        it('should allow ValueSelector on an "if" at the root of a primitive document', () => {
          const primitiveDoc = new PrimitiveDocument(
            new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
          );
          const primitiveTree = new MappingTree(
            primitiveDoc.documentType,
            primitiveDoc.documentId,
            DocumentDefinitionType.Primitive,
          );
          MappingActionService.applyIf(new TargetDocumentNodeData(primitiveDoc, primitiveTree));

          const primitiveRows = VisualizationService.generatePrimitiveDocumentChildren(
            new TargetDocumentNodeData(primitiveDoc, primitiveTree),
          );
          expectValueSelectorAllowed(findMappingRow(primitiveRows, IfItem), true);
        });

        it('should judge an inner "if" on JSON rows by the field type', () => {
          const jsonDoc = TestUtil.createJSONTargetOrderDoc();
          const jsonTree = new MappingTree(
            jsonDoc.documentType,
            jsonDoc.documentId,
            DocumentDefinitionType.JSON_SCHEMA,
          );
          const jsonRootRows = () => childrenOf(rootRows(jsonDoc, jsonTree)[0]);
          MappingActionService.applyInnerIf(findJsonRow(jsonRootRows(), 'ShipTo'));
          MappingActionService.applyInnerIf(findJsonRow(jsonRootRows(), 'OrderPerson'));

          const rows = jsonRootRows();
          expectValueSelectorAllowed(findMappingRow(childrenOf(findJsonRow(rows, 'ShipTo')), IfItem), false);
          expectValueSelectorAllowed(findMappingRow(childrenOf(findJsonRow(rows, 'OrderPerson')), IfItem), true);
        });
      });

      describe('variables', () => {
        const shipOrderRow = () => findRow(rootRows(targetDoc, tree), 'ShipOrder');

        it('should offer neither ValueSelector nor CopyOfSelector on a variable row', () => {
          const shipOrderItem = MappingActionService.getOrCreateFieldItem(shipOrderRow());
          MappingService.addVariable(shipOrderItem, 'var1', '/ns0:ShipOrder/OrderPerson');

          const variableRow = findMappingRow(childrenOf(shipOrderRow()), VariableItem);
          expectActionAllowed(variableRow, MappingActionKind.ValueSelector, false);
          expectActionAllowed(variableRow, MappingActionKind.CopyOfSelector, false);
        });

        it('should offer neither ValueSelector nor CopyOfSelector on the rows of an imported variable content', () => {
          const shipOrderRows = childrenOf(shipOrderRow());
          const orderPersonField = findFieldRow(shipOrderRows, 'OrderPerson').field;
          const shipToField = findFieldRow(shipOrderRows, 'ShipTo').field;
          const variable = MappingService.addVariable(
            MappingActionService.getOrCreateFieldItem(shipOrderRow()),
            'var1',
          );
          MappingService.createFieldItem(variable, orderPersonField);
          MappingService.createFieldItem(variable, shipToField);
          variable.children.push(new IfItem(variable));

          const variableRows = childrenOf(findMappingRow(childrenOf(shipOrderRow()), VariableItem));
          const rowsInVariable = [
            findRow(variableRows, 'OrderPerson'),
            findFieldRow(childrenOf(findRow(variableRows, 'ShipTo')), 'Name'),
            findMappingRow(variableRows, IfItem),
          ];
          for (const row of rowsInVariable) {
            expectActionAllowed(row, MappingActionKind.ValueSelector, false);
            expectActionAllowed(row, MappingActionKind.CopyOfSelector, false);
          }
        });
      });
    });

    describe('getMappingContextMenuItems() AddField isDisabled', () => {
      function createFieldSubstitutionSetup() {
        const definition = new DocumentDefinition(
          DocumentType.TARGET_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'FieldSubstitution',
        );
        const document = new XmlSchemaDocument(definition, new XmlSchemaCollection());
        const root = new XmlSchemaField(document, 'Root', false);
        root.type = Types.Container;
        document.fields = [root];

        const containerField = new XmlSchemaField(root, 'Container', false);
        containerField.type = Types.Container;
        root.fields = [containerField];

        return { document, root, containerField };
      }

      it('should disable AddField when all maxOccurs=1 slots are occupied', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const childA = new XmlSchemaField(containerField, 'ChildA', false);
        childA.type = Types.String;
        childA.maxOccurs = 1;
        const childB = new XmlSchemaField(containerField, 'ChildB', false);
        childB.type = Types.String;
        childB.maxOccurs = 1;
        containerField.fields = [childA, childB];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const ifItem = new IfItem(fieldItem);
        ifItem.expression = 'true()';
        fieldItem.children.push(ifItem);
        const mappedChildA = new FieldItem(ifItem, childA);
        mappedChildA.isUserCreated = true;
        ifItem.children.push(mappedChildA);
        const mappedChildB = new FieldItem(ifItem, childB);
        mappedChildB.isUserCreated = true;
        ifItem.children.push(mappedChildB);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const ifNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof IfItem,
        ) as MappingNodeData;
        expect(ifNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(ifNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(ifNode as TargetNodeData)).toBe(true);
      });

      it('should not disable AddField when slots remain', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const childA = new XmlSchemaField(containerField, 'ChildA', false);
        childA.type = Types.String;
        childA.maxOccurs = 1;
        const childB = new XmlSchemaField(containerField, 'ChildB', false);
        childB.type = Types.String;
        childB.maxOccurs = 1;
        containerField.fields = [childA, childB];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const ifItem = new IfItem(fieldItem);
        ifItem.expression = 'true()';
        fieldItem.children.push(ifItem);
        const mappedChildA = new FieldItem(ifItem, childA);
        mappedChildA.isUserCreated = true;
        ifItem.children.push(mappedChildA);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const ifNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof IfItem,
        ) as MappingNodeData;
        expect(ifNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(ifNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(ifNode as TargetNodeData)).toBe(false);
      });

      it('should not disable AddField when maxOccurs is unbounded', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const child = new XmlSchemaField(containerField, 'Child', false);
        child.type = Types.String;
        child.maxOccurs = 'unbounded';
        containerField.fields = [child];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const ifItem = new IfItem(fieldItem);
        ifItem.expression = 'true()';
        fieldItem.children.push(ifItem);
        const mappedChild = new FieldItem(ifItem, child);
        mappedChild.isUserCreated = true;
        ifItem.children.push(mappedChild);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const ifNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof IfItem,
        ) as MappingNodeData;
        expect(ifNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(ifNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(ifNode as TargetNodeData)).toBe(false);
      });

      it('should allow AddField on ForEachItem with FieldItem ancestor', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const child = new XmlSchemaField(containerField, 'Child', false);
        child.type = Types.String;
        child.maxOccurs = 'unbounded';
        containerField.fields = [child];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const forEachItem = new ForEachItem(fieldItem);
        fieldItem.children.push(forEachItem);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const forEachNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
        ) as MappingNodeData;
        expect(forEachNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(forEachNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(forEachNode as TargetNodeData)).toBe(false);
      });

      it('should disable AddField on ForEachItem when no maxOccurs>1 children exist', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const child = new XmlSchemaField(containerField, 'Child', false);
        child.type = Types.String;
        child.maxOccurs = 1;
        containerField.fields = [child];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const forEachItem = new ForEachItem(fieldItem);
        fieldItem.children.push(forEachItem);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const forEachNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
        ) as MappingNodeData;
        expect(forEachNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(forEachNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(forEachNode as TargetNodeData)).toBe(true);
      });

      it('should not disable AddField on ForEachItem when maxOccurs=unbounded children exist', () => {
        const { document, root, containerField } = createFieldSubstitutionSetup();
        const child = new XmlSchemaField(containerField, 'Child', false);
        child.type = Types.String;
        child.maxOccurs = 'unbounded';
        containerField.fields = [child];

        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const rootFieldItem = new FieldItem(mappingTree, root);
        mappingTree.children.push(rootFieldItem);
        const fieldItem = new FieldItem(rootFieldItem, containerField);
        fieldItem.isUserCreated = true;
        rootFieldItem.children.push(fieldItem);
        const forEachItem = new ForEachItem(fieldItem);
        fieldItem.children.push(forEachItem);

        const docNode = new TargetDocumentNodeData(document, mappingTree);
        const docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
        const rootChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
        const containerChildren = VisualizationService.generateNonDocumentNodeDataChildren(rootChildren[0]);
        const forEachNode = containerChildren.find(
          (c) => c instanceof MappingNodeData && c.mapping instanceof ForEachItem,
        ) as MappingNodeData;
        expect(forEachNode).toBeDefined();

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(forEachNode as TargetNodeData);
        const addFieldAction = menuItems.find((item) => item.key === MappingActionKind.AddField);
        expect(addFieldAction).toBeDefined();
        expect(addFieldAction!.isDisabled!(forEachNode as TargetNodeData)).toBe(false);
      });
    });

    describe('getExpressionItemForNode()', () => {
      it('should return ValueSelector for primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        MappingActionService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem?.expression).toBe('/ns0:ShipOrder/ns0:OrderPerson');
      });
    });

    describe('deleteMappingItem()', () => {
      it('should delete primitive target body mapping', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
        const sourceShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceDocChildren[0]);
        MappingActionService.engageMapping(tree, sourceShipOrderChildren[1] as FieldNodeData, targetDocNode);

        MappingActionService.deleteMappingItem(targetDocNode);
        const expressionItem = VisualizationService.getExpressionItemForNode(targetDocNode);
        expect(expressionItem).toBeUndefined();
      });

      it('should delete copy-of added on primitive target body', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        tree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.Primitive,
        );
        targetDocNode = new TargetDocumentNodeData(primitiveTargetDoc, tree);
        MappingActionService.applyCopyOfSelector(targetDocNode);
        expect(tree.children).toHaveLength(1);
        expect(tree.children[0]).toBeInstanceOf(CopyOfSelector);

        const copyOfNodeData = VisualizationService.generatePrimitiveDocumentChildren(
          targetDocNode,
        )[0] as MappingNodeData;
        expect(copyOfNodeData).toBeInstanceOf(MappingNodeData);
        MappingActionService.deleteMappingItem(copyOfNodeData);
        expect(tree.children).toHaveLength(0);
      });
    });
  });

  describe('with pre-populated mappings', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    describe('getAllowedActions() if/choose', () => {
      it('should test if or choose is allowed', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        expect(MappingActionRegistryService.getAllowedActions(targetDocNode)).toContain(MappingActionKind.If);
        expect(MappingActionRegistryService.getAllowedActions(targetDocNode)).toContain(MappingActionKind.Choose);
        expect(MappingActionRegistryService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.If,
        );
        expect(MappingActionRegistryService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.Choose,
        );
        expect(MappingActionRegistryService.getAllowedActions(shipOrderChildren[1] as TargetNodeData)).not.toContain(
          MappingActionKind.If,
        );
        expect(MappingActionRegistryService.getAllowedActions(shipOrderChildren[1] as TargetNodeData)).not.toContain(
          MappingActionKind.Choose,
        );
      });
    });

    describe('deleteMappingItem()', () => {
      it('should delete', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren[1] instanceof MappingNodeData).toBeTruthy();
        MappingActionService.deleteMappingItem(shipOrderChildren[1] as TargetNodeData);

        shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren[1] instanceof TargetFieldNodeData).toBeTruthy();
      });
    });

    describe('getAllowedActions()', () => {
      it('should include ContextMenu for appropriate nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(MappingActionRegistryService.getAllowedActions(targetDocNode)).not.toContain(
          MappingActionKind.ContextMenu,
        );
        expect(MappingActionRegistryService.getAllowedActions(targetDocChildren[0] as TargetNodeData)).toContain(
          MappingActionKind.ContextMenu,
        );

        expect(shipOrderChildren).toHaveLength(5);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toBe('OrderId');
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).toContain(MappingActionKind.ContextMenu);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toBe('if');
        expect(MappingActionRegistryService.getAllowedActions(ifNode)).toContain(MappingActionKind.ContextMenu);

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(shipToNode.title).toBe('ShipTo');
        expect(MappingActionRegistryService.getAllowedActions(shipToNode)).toContain(MappingActionKind.ContextMenu);

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toBe('for-each');
        expect(MappingActionRegistryService.getAllowedActions(forEachNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionRegistryService.getAllowedActions(forEachNode)).toContain(MappingActionKind.Sort);

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode.title).toBe('Item');
        expect(addMappingNode.id).toContain('add-mapping-fx-Item');
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ForEach);
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).toContain(
          MappingActionKind.ForEachGroup,
        );
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.If);
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.Choose);
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).toContain(MappingActionKind.ContextMenu);
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).not.toContain(
          MappingActionKind.ValueSelector,
        );
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).not.toContain(
          MappingActionKind.CopyOfSelector,
        );
      });

      it('should allow Delete for a field node added via Add Mapping', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(addMappingNode instanceof AddMappingNodeData).toBeTruthy();
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).not.toContain(MappingActionKind.Delete);
        MappingActionService.addMapping(addMappingNode);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );

        const addedNode = updatedShipOrderChildren.find(
          (n) => n instanceof FieldItemNodeData && n.title === 'Item',
        ) as FieldItemNodeData;
        expect(addedNode).toBeDefined();
        expect(MappingActionRegistryService.getAllowedActions(addedNode)).toContain(MappingActionKind.Delete);
      });

      it('should keep Delete for an existing value-mapped field node', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toBe('OrderId');
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).toContain(MappingActionKind.Delete);
      });

      it('should include ContextMenu for primitive TargetDocumentNodeData', () => {
        const primitiveTargetDoc = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        const primitiveTree = new MappingTree(
          primitiveTargetDoc.documentType,
          primitiveTargetDoc.documentId,
          DocumentDefinitionType.Primitive,
        );
        const primitiveDocNode = new TargetDocumentNodeData(primitiveTargetDoc, primitiveTree);
        expect(MappingActionRegistryService.getAllowedActions(primitiveDocNode)).toContain(
          MappingActionKind.ContextMenu,
        );
      });

      it('should allow ContextMenu and ForEachGroupConfig but exclude Sort and ValueSelector for for-each-group nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const itemNode = shipOrderChildren[3] as MappingNodeData;
        expect(itemNode.title).toBe('for-each');

        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemNode);
        const fieldInsideForEach = forEachChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEach.title).toBe('Item');
        expect(MappingActionRegistryService.getAllowedActions(fieldInsideForEach)).toContain(
          MappingActionKind.ContextMenu,
        );

        MappingActionService.applyForEachGroup(shipOrderChildren[4] as AddMappingNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );

        const forEachGroupNode = updatedShipOrderChildren[4] as MappingNodeData;
        expect(forEachGroupNode.title).toBe('for-each-group');
        expect(forEachGroupNode.mapping instanceof ForEachGroupItem).toBeTruthy();
        expect(MappingActionRegistryService.getAllowedActions(forEachGroupNode)).toContain(
          MappingActionKind.ContextMenu,
        );
        expect(MappingActionRegistryService.getAllowedActions(forEachGroupNode)).toContain(
          MappingActionKind.ForEachGroupConfig,
        );
        expect(MappingActionRegistryService.getAllowedActions(forEachGroupNode)).not.toContain(MappingActionKind.Sort);
        expect(MappingActionRegistryService.getAllowedActions(forEachGroupNode)).not.toContain(
          MappingActionKind.ValueSelector,
        );

        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode);
        const fieldInsideForEachGroup = forEachGroupChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEachGroup.title).toBe('Item');
        expect(MappingActionRegistryService.getAllowedActions(fieldInsideForEachGroup)).toContain(
          MappingActionKind.ContextMenu,
        );
      });

      it('should allow ForEachCurrentGroup for collection fields inside for-each-group', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        MappingActionService.applyForEachGroup(shipOrderChildren[4] as AddMappingNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );

        const forEachGroupNode = updatedShipOrderChildren[4] as MappingNodeData;
        expect(forEachGroupNode.title).toBe('for-each-group');
        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode);
        const fieldInsideForEachGroup = forEachGroupChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEachGroup.title).toBe('Item');
        expect(MappingActionRegistryService.getAllowedActions(fieldInsideForEachGroup)).toContain(
          MappingActionKind.ForEachCurrentGroup,
        );
      });

      it('should not allow ForEachCurrentGroup for fields outside for-each-group', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const itemNode = shipOrderChildren[3] as MappingNodeData;
        const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemNode);
        const fieldInsideForEach = forEachChildren[0] as FieldItemNodeData;
        expect(fieldInsideForEach.title).toBe('Item');
        expect(MappingActionRegistryService.getAllowedActions(fieldInsideForEach)).not.toContain(
          MappingActionKind.ForEachCurrentGroup,
        );
      });

      it('should not allow ForEachCurrentGroup when already inside for-each current-group()', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        MappingActionService.applyForEachGroup(shipOrderChildren[4] as AddMappingNodeData);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        let updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        let updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode = updatedShipOrderChildren[4] as MappingNodeData;
        const forEachGroupChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode);
        const fieldInsideGroup = forEachGroupChildren[0] as FieldItemNodeData;

        MappingActionService.applyForEachCurrentGroup(fieldInsideGroup);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(updatedDocChildren[0]);
        const forEachGroupNode2 = updatedShipOrderChildren[4] as MappingNodeData;
        const groupChildren2 = VisualizationService.generateNonDocumentNodeDataChildren(forEachGroupNode2);
        const forEachCurrentGroupNode = groupChildren2[0] as MappingNodeData;
        expect(forEachCurrentGroupNode.title).toBe('for-each');
        expect((forEachCurrentGroupNode.mapping as ForEachItem).expression).toBe('current-group()');

        const innerChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachCurrentGroupNode);
        const fieldInsideCurrentGroup = innerChildren[0] as FieldItemNodeData;
        expect(fieldInsideCurrentGroup.title).toBe('Item');
        expect(MappingActionRegistryService.getAllowedActions(fieldInsideCurrentGroup)).not.toContain(
          MappingActionKind.ForEachCurrentGroup,
        );
      });
    });

    describe('Sort action availability', () => {
      it('should not include Sort for non-ForEach nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.Sort);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(MappingActionRegistryService.getAllowedActions(ifNode)).not.toContain(MappingActionKind.Sort);
      });
    });

    describe('ValueSelector action availability', () => {
      it('should disallow ValueSelector on a mapped container row', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const shipToNode = shipOrderChildren.find((c) => c.title === 'ShipTo');
        if (!(shipToNode instanceof FieldItemNodeData)) throw new Error('Mapped ShipTo row not found');

        expect(MappingActionRegistryService.getAllowedActions(shipToNode)).not.toContain(
          MappingActionKind.ValueSelector,
        );
        expect(
          MappingActionRegistryService.getMappingContextMenuItems(shipToNode).some(
            (item) => item.key === MappingActionKind.ValueSelector,
          ),
        ).toBe(false);
      });
    });

    describe('Variable action availability', () => {
      it('should include Variable for container FieldItemNodeData and TargetFieldNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const shipOrderNode = targetDocChildren[0] as FieldItemNodeData;
        expect(MappingActionRegistryService.getAllowedActions(shipOrderNode)).toContain(MappingActionKind.Variable);

        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        expect(MappingActionRegistryService.getAllowedActions(shipToNode)).toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for TargetDocumentNodeData', () => {
        expect(MappingActionRegistryService.getAllowedActions(targetDocNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).not.toContain(
          MappingActionKind.Variable,
        );
      });

      it('should not include Variable for terminal field nodes', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toBe('OrderId');
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should include Variable for ForEachItem and IfItem MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toBe('if');
        expect(MappingActionRegistryService.getAllowedActions(ifNode)).toContain(MappingActionKind.Variable);

        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toBe('for-each');
        expect(MappingActionRegistryService.getAllowedActions(forEachNode)).toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for VariableNodeData', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);
        expect(MappingActionRegistryService.getAllowedActions(variableNode)).not.toContain(MappingActionKind.Variable);
      });

      it('should not include Variable for ValueSelector, ChooseItem, or UnknownMappingItem MappingNodeData', () => {
        const fieldItem = new FieldItem(tree, targetDoc.fields[0]);
        tree.children.push(fieldItem);
        const valueSelector = new ValueOfSelector(fieldItem);
        fieldItem.children.push(valueSelector);
        const valueSelectorNode = new MappingNodeData(targetDocNode, valueSelector);
        expect(MappingActionRegistryService.getAllowedActions(valueSelectorNode)).not.toContain(
          MappingActionKind.Variable,
        );

        const chooseItem = new ChooseItem(fieldItem, targetDoc.fields[0]);
        const chooseNode = new MappingNodeData(targetDocNode, chooseItem);
        expect(MappingActionRegistryService.getAllowedActions(chooseNode)).not.toContain(MappingActionKind.Variable);

        const unknownElement = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
        const unknownItem = new UnknownMappingItem(fieldItem, unknownElement);
        fieldItem.children.push(unknownItem);
        const unknownNode = new MappingNodeData(targetDocNode, unknownItem);
        expect(MappingActionRegistryService.getAllowedActions(unknownNode)).not.toContain(MappingActionKind.Variable);
      });
    });

    describe('RenameVariable action availability', () => {
      it('should include RenameVariable only for VariableNodeData', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);
        expect(MappingActionRegistryService.getAllowedActions(variableNode)).toContain(
          MappingActionKind.RenameVariable,
        );
      });

      it('should not include RenameVariable for non-variable nodes', () => {
        expect(MappingActionRegistryService.getAllowedActions(targetDocNode)).not.toContain(
          MappingActionKind.RenameVariable,
        );

        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).not.toContain(
          MappingActionKind.RenameVariable,
        );

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(MappingActionRegistryService.getAllowedActions(ifNode)).not.toContain(MappingActionKind.RenameVariable);

        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(MappingActionRegistryService.getAllowedActions(addMappingNode)).not.toContain(
          MappingActionKind.RenameVariable,
        );
      });
    });

    describe('addMapping()', () => {
      it('should add an empty mapping', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        expect(shipOrderChildren).toHaveLength(5);

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];

        expect(shipOrderChildren[4] instanceof AddMappingNodeData).toBeTruthy();
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        expect(shipOrderMappingItem.children).toHaveLength(4);
        MappingActionService.addMapping(addMappingNode);

        expect(shipOrderMappingItem.children).toHaveLength(5);
        expect(shipOrderMappingItem.children[4] instanceof FieldItem).toBeTruthy();
        const itemItem = shipOrderMappingItem.children[4] as FieldItem;
        expect(itemItem.field.name).toBe('Item');
      });
    });

    describe('getOrCreateParentMapping()', () => {
      it('should return mappingTree for TargetDocumentNodeData', () => {
        const result = MappingActionService.getOrCreateParentMapping(targetDocNode);
        expect(result).toBe(tree);
      });

      it('should return FieldItem for AddMappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        const result = MappingActionService.getOrCreateParentMapping(addMappingNode);
        expect(result).toBeDefined();
        expect(result instanceof FieldItem).toBeTruthy();
      });

      it('should return FieldItem for TargetFieldNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const shipToNode = shipOrderChildren[2] as TargetFieldNodeData;
        const result = MappingActionService.getOrCreateParentMapping(shipToNode);
        expect(result).toBeDefined();
      });

      it('should return FieldItem for FieldItemNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        const result = MappingActionService.getOrCreateParentMapping(orderIdNode);
        expect(result).toBeDefined();
      });

      it('should return mapping for MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifNode = shipOrderChildren[1] as MappingNodeData;
        const result = MappingActionService.getOrCreateParentMapping(ifNode);
        expect(result).toBe(ifNode.mapping);
      });
    });

    describe('Variable and RenameVariable action apply callbacks', () => {
      it('Variable apply should call setAddingVariableTo with node path', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderNode = targetDocChildren[0] as FieldItemNodeData;
        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(shipOrderNode);
        const variableAction = menuItems.find((item) => item.key === MappingActionKind.Variable);
        expect(variableAction).toBeDefined();
        expect(variableAction!.getLabel(shipOrderNode)).toBe('Add variable');

        variableAction!.apply(shipOrderNode, { onUpdate: vi.fn(), openModal: vi.fn() });
        expect(useDocumentTreeStore.getState().addingVariableToNodePath).toEqual(shipOrderNode.path.toString());

        useDocumentTreeStore.getState().setAddingVariableTo(null);
      });

      it('RenameVariable apply should call setRenamingVariable with variable id', () => {
        const variable = new VariableItem(tree, 'testVar');
        tree.children.push(variable);
        const variableNode = new VariableNodeData(targetDocNode, variable);

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(variableNode);
        const renameAction = menuItems.find((item) => item.key === MappingActionKind.RenameVariable);
        expect(renameAction).toBeDefined();
        expect(renameAction!.getLabel(variableNode)).toBe('Rename variable');

        renameAction!.apply(variableNode, { onUpdate: vi.fn(), openModal: vi.fn() });
        expect(useDocumentTreeStore.getState().renamingVariableId).toEqual(variable.id);

        useDocumentTreeStore.getState().setRenamingVariable(null);
      });
    });

    describe('Duplicate', () => {
      it('should include Duplicate for IfItem MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toBe('if');
        expect(MappingActionRegistryService.getAllowedActions(ifNode)).toContain(MappingActionKind.Duplicate);
      });

      it('should include Duplicate for collection FieldItemNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        MappingActionService.addMapping(addMappingNode);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const addedNode = updatedShipOrderChildren.find(
          (n) => n instanceof FieldItemNodeData && n.title === 'Item',
        ) as FieldItemNodeData;
        expect(addedNode).toBeDefined();
        expect(MappingActionRegistryService.getAllowedActions(addedNode)).toContain(MappingActionKind.Duplicate);
      });

      it('should not include Duplicate for non-collection FieldItemNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const orderIdNode = shipOrderChildren[0] as FieldItemNodeData;
        expect(orderIdNode.title).toBe('OrderId');
        expect(MappingActionRegistryService.getAllowedActions(orderIdNode)).not.toContain(MappingActionKind.Duplicate);
      });

      it('should not include Duplicate for non-IfItem MappingNodeData', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const forEachNode = shipOrderChildren[3] as MappingNodeData;
        expect(forEachNode.title).toBe('for-each');
        expect(MappingActionRegistryService.getAllowedActions(forEachNode)).not.toContain(MappingActionKind.Duplicate);
      });

      it('should create a new FieldItem with isUserCreated when duplicating a collection field', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        MappingActionService.addMapping(addMappingNode);

        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const addedNode = updatedShipOrderChildren.find(
          (n) => n instanceof FieldItemNodeData && n.title === 'Item',
        ) as FieldItemNodeData;
        expect(addedNode).toBeDefined();

        const shipOrderMappingItem = targetDocNode.mappingTree.children[0];
        const childCountBefore = shipOrderMappingItem.children.length;

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(addedNode);
        const duplicateAction = menuItems.find((item) => item.key === MappingActionKind.Duplicate);
        expect(duplicateAction).toBeDefined();
        duplicateAction!.apply(addedNode, { onUpdate: vi.fn(), openModal: vi.fn() });

        expect(shipOrderMappingItem.children).toHaveLength(childCountBefore + 1);
        const newChild = shipOrderMappingItem.children[childCountBefore] as FieldItem;
        expect(newChild instanceof FieldItem).toBeTruthy();
        expect(newChild.field.name).toBe('Item');
        expect(newChild.isUserCreated).toBe(true);
      });

      it('should clone IfItem with empty expression when duplicating "if"', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
        const ifNode = shipOrderChildren[1] as MappingNodeData;
        expect(ifNode.title).toBe('if');
        const originalIf = ifNode.mapping as IfItem;
        const originalExpression = originalIf.expression;
        const originalChildCount = originalIf.children.length;
        const parent = originalIf.parent;
        const indexBefore = parent.children.indexOf(originalIf);

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(ifNode);
        const duplicateAction = menuItems.find((item) => item.key === MappingActionKind.Duplicate);
        expect(duplicateAction).toBeDefined();
        duplicateAction!.apply(ifNode, { onUpdate: vi.fn(), openModal: vi.fn() });

        const clonedIf = parent.children[indexBefore + 1] as IfItem;
        expect(clonedIf instanceof IfItem).toBeTruthy();
        expect(clonedIf).not.toBe(originalIf);
        expect(clonedIf.expression).toBe('');
        expect(originalIf.expression).toBe(originalExpression);
        expect(clonedIf.children).toHaveLength(originalChildCount);
        expect(clonedIf.parent).toBe(parent);
      });

      it('should return dynamic label based on node type', () => {
        const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);

        const ifNode = shipOrderChildren[1] as MappingNodeData;
        const ifMenuItems = MappingActionRegistryService.getMappingContextMenuItems(ifNode);
        const ifDuplicateAction = ifMenuItems.find((item) => item.key === MappingActionKind.Duplicate);
        expect(ifDuplicateAction).toBeDefined();
        expect(ifDuplicateAction!.getLabel(ifNode)).toBe('Duplicate "if"');

        const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;
        MappingActionService.addMapping(addMappingNode);
        targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
        const updatedDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
        const updatedShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(
          updatedDocChildren[0],
        );
        const addedNode = updatedShipOrderChildren.find(
          (n) => n instanceof FieldItemNodeData && n.title === 'Item',
        ) as FieldItemNodeData;
        const fieldMenuItems = MappingActionRegistryService.getMappingContextMenuItems(addedNode);
        const fieldDuplicateAction = fieldMenuItems.find((item) => item.key === MappingActionKind.Duplicate);
        expect(fieldDuplicateAction).toBeDefined();
        expect(fieldDuplicateAction!.getLabel(addedNode)).toBe('Duplicate');
      });

      it('should preserve document-level selection after duplicating a wrapper member', () => {
        const baseField = sourceDoc.fields[0];
        const catField = { ...baseField, name: 'Cat', displayName: 'Cat', fields: [] };
        const dogField = { ...baseField, name: 'Dog', displayName: 'Dog', fields: [] };
        const abstractField = {
          ...baseField,
          name: 'AbstractElement',
          displayName: 'AbstractElement',
          wrapperKind: 'abstract' as const,
          selectedMemberQName: {
            getNamespaceURI: () => baseField.namespaceURI ?? '',
            getLocalPart: () => 'Cat',
          },
          maxOccurs: 'unbounded' as const,
          fields: [catField, dogField],
          ownerDocument: targetDoc,
        } as unknown as typeof baseField;
        const parentField = { ...targetDoc.fields[0], fields: [abstractField] };

        const localTree = new MappingTree(
          targetDoc.documentType,
          targetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        localTree.namespaceMap = {};
        const parentFieldItem = new FieldItem(localTree, parentField as (typeof targetDoc.fields)[0]);
        const catFieldItem = new FieldItem(parentFieldItem, catField as unknown as typeof baseField);
        parentFieldItem.children.push(catFieldItem);
        localTree.children.push(parentFieldItem);

        const localTargetDocNode = new TargetDocumentNodeData(targetDoc, localTree);
        const parentNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
        parentNode.mapping = parentFieldItem;

        const catNode = new TargetAbstractFieldNodeData(parentNode, catField as unknown as typeof baseField);
        catNode.abstractField = abstractField;
        catNode.mapping = catFieldItem;

        const menuItems = MappingActionRegistryService.getMappingContextMenuItems(catNode);
        const duplicateAction = menuItems.find((item) => item.key === MappingActionKind.Duplicate);
        expect(duplicateAction).toBeDefined();
        duplicateAction!.apply(catNode, { onUpdate: vi.fn(), openModal: vi.fn() });

        expect(abstractField.selectedMemberQName).toBeDefined();
        expect(parentFieldItem.children).toHaveLength(2);
        expect(parentFieldItem.children.every((c) => c instanceof FieldItem && c.field.name === 'Cat')).toBe(true);
      });
    });
  });

  describe('getAllowedActions() delete', () => {
    it('should identify deletable nodes', () => {
      MappingSerializerService.deserialize(getConditionalMappingsToShipOrderXslt(), targetDoc, tree, paramsMap);
      const docData = new TargetDocumentNodeData(targetDoc, tree);

      const fieldNodeData = new FieldItemNodeData(docData, tree.children[0] as FieldItem);
      expect(MappingActionRegistryService.getAllowedActions(fieldNodeData)).not.toContain(MappingActionKind.Delete);

      const forEachNodeData = new MappingNodeData(docData, tree.children[0].children[0] as ForEachItem);
      expect(MappingActionRegistryService.getAllowedActions(forEachNodeData)).toContain(MappingActionKind.Delete);

      const valueSelectorNodeData = new MappingNodeData(
        docData,
        tree.children[0].children[0].children[0] as ValueSelector,
      );
      expect(MappingActionRegistryService.getAllowedActions(valueSelectorNodeData)).toContain(MappingActionKind.Delete);
    });
  });

  describe('getAllowedActions() on unselected wrapper fields', () => {
    const disallowedOnUnselectedWrapperKinds = [
      MappingActionKind.InnerForEach,
      MappingActionKind.InnerForEachGroup,
      MappingActionKind.InnerChoose,
      MappingActionKind.InnerIf,
      MappingActionKind.ValueSelector,
      MappingActionKind.CopyOfSelector,
    ];

    it('should disallow actions on unselected choice field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const choiceField = new XmlSchemaField(parentField, 'testChoice', false);
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      const memberA = new XmlSchemaField(choiceField, 'memberA', false);
      memberA.type = Types.String;
      choiceField.fields = [memberA];
      parentField.fields.push(choiceField);

      const unselectedNode = new TargetChoiceFieldNodeData(docNode, choiceField);
      const allowed = MappingActionRegistryService.getAllowedActions(unselectedNode);
      for (const kind of disallowedOnUnselectedWrapperKinds) {
        expect(allowed).not.toContain(kind);
      }
    });

    it('should allow actions on selected choice field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const choiceField = new XmlSchemaField(parentField, 'testChoice', false);
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      const memberA = new XmlSchemaField(choiceField, 'memberA', false);
      memberA.type = Types.String;
      choiceField.fields = [memberA];
      parentField.fields.push(choiceField);

      const selectedNode = new TargetChoiceFieldNodeData(docNode, memberA);
      selectedNode.choiceField = choiceField;
      const allowed = MappingActionRegistryService.getAllowedActions(selectedNode);
      for (const kind of disallowedOnUnselectedWrapperKinds) {
        expect(allowed).toContain(kind);
      }
    });

    it('should disallow actions on unsubstituted abstract field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const abstractField = new XmlSchemaField(parentField, 'testAbstract', false);
      abstractField.type = Types.Container;
      abstractField.wrapperKind = 'abstract';
      const candidate = new XmlSchemaField(abstractField, 'ConcreteType', false);
      candidate.type = Types.String;
      abstractField.fields = [candidate];
      parentField.fields.push(abstractField);

      const unselectedNode = new TargetAbstractFieldNodeData(docNode, abstractField);
      const allowed = MappingActionRegistryService.getAllowedActions(unselectedNode);
      for (const kind of disallowedOnUnselectedWrapperKinds) {
        expect(allowed).not.toContain(kind);
      }
    });

    it('should allow actions on substituted abstract field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const abstractField = new XmlSchemaField(parentField, 'testAbstract', false);
      abstractField.type = Types.Container;
      abstractField.wrapperKind = 'abstract';
      const candidate = new XmlSchemaField(abstractField, 'ConcreteType', false);
      candidate.type = Types.String;
      abstractField.fields = [candidate];
      parentField.fields.push(abstractField);

      const selectedNode = new TargetAbstractFieldNodeData(docNode, candidate);
      selectedNode.abstractField = abstractField;
      const allowed = MappingActionRegistryService.getAllowedActions(selectedNode);
      for (const kind of disallowedOnUnselectedWrapperKinds) {
        expect(allowed).toContain(kind);
      }
    });

    it('should disallow Variable on unselected choice field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const choiceField = new XmlSchemaField(parentField, 'testChoice', false);
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      const memberA = new XmlSchemaField(choiceField, 'memberA', false);
      memberA.type = Types.String;
      choiceField.fields = [memberA];
      parentField.fields.push(choiceField);

      const unselectedNode = new TargetChoiceFieldNodeData(docNode, choiceField);
      expect(MappingActionRegistryService.getAllowedActions(unselectedNode)).not.toContain(MappingActionKind.Variable);
    });

    it('should disallow Variable on unsubstituted abstract field', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const docNode = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const abstractField = new XmlSchemaField(parentField, 'testAbstract', false);
      abstractField.type = Types.Container;
      abstractField.wrapperKind = 'abstract';
      const candidate = new XmlSchemaField(abstractField, 'ConcreteType', false);
      candidate.type = Types.String;
      abstractField.fields = [candidate];
      parentField.fields.push(abstractField);

      const unselectedNode = new TargetAbstractFieldNodeData(docNode, abstractField);
      expect(MappingActionRegistryService.getAllowedActions(unselectedNode)).not.toContain(MappingActionKind.Variable);
    });
  });

  describe('UnknownMappingItem visibility', () => {
    beforeEach(() => {
      MappingSerializerService.deserialize(getUnknownApplyTemplateXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should include UnknownMappingNodeData in field children when mapping contains an unrecognized XSL element', () => {
      const shipOrderItem = tree.children[0];
      expect(shipOrderItem.children[0]).toBeInstanceOf(UnknownMappingItem);
      expect((shipOrderItem.children[0] as UnknownMappingItem).name).toBe('unknown');
      expect((shipOrderItem.children[0] as UnknownMappingItem).element.localName).toBe('apply-templates');

      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderNode = docChildren[0] as FieldItemNodeData;
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode);

      const unknownNode = shipOrderChildren.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(unknownNode.title).toBe('unknown');
      expect(unknownNode.mapping).toBeInstanceOf(UnknownMappingItem);
    });

    it('should mark UnknownMappingNodeData as deletable and disallow condition menu and value selector', () => {
      const docChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderNode = docChildren[0] as FieldItemNodeData;
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode);

      const unknownNode = shipOrderChildren.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(MappingActionRegistryService.getAllowedActions(unknownNode)).toContain(MappingActionKind.Delete);
      expect(MappingActionRegistryService.getAllowedActions(unknownNode)).not.toContain(MappingActionKind.ContextMenu);
      expect(MappingActionRegistryService.getAllowedActions(unknownNode)).not.toContain(
        MappingActionKind.ValueSelector,
      );
    });

    it('should include UnknownMappingNodeData in children of a primitive target document', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primitiveTree = new MappingTree(
        DocumentType.TARGET_BODY,
        BODY_DOCUMENT_ID,
        DocumentDefinitionType.Primitive,
      );
      const element = document.createElementNS('http://www.w3.org/1999/XSL/Transform', 'apply-templates');
      element.setAttribute('select', '/ns0:ShipOrder/Item');
      primitiveTree.children.push(new UnknownMappingItem(primitiveTree, element));
      const primitiveDocNode = new TargetDocumentNodeData(primitiveDoc, primitiveTree);

      const children = VisualizationService.generateStructuredDocumentChildren(primitiveDocNode);

      const unknownNode = children.find((n) => n instanceof UnknownMappingNodeData) as UnknownMappingNodeData;
      expect(unknownNode).toBeDefined();
      expect(unknownNode.mapping.element.localName).toBe('apply-templates');
    });
  });

  describe('ACTION_REGISTRY apply smoke tests', () => {
    it('should successfully apply all context menu actions allowed for AddMappingNodeData', () => {
      MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, tree, paramsMap);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);

      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetDocChildren[0]);
      const addMappingNode = shipOrderChildren[4] as AddMappingNodeData;

      const menuItems = MappingActionRegistryService.getMappingContextMenuItems(addMappingNode);
      expect(menuItems.length).toBeGreaterThan(0);

      for (const item of menuItems) {
        const freshTree = new MappingTree(
          targetDoc.documentType,
          targetDoc.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        MappingSerializerService.deserialize(getShipOrderToShipOrderXslt(), targetDoc, freshTree, paramsMap);
        const freshDocNode = new TargetDocumentNodeData(targetDoc, freshTree);
        const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
        const freshShipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshDocChildren[0]);
        const freshAddMappingNode = freshShipOrderChildren[4] as AddMappingNodeData;

        const onUpdate = vi.fn();
        const openModal = vi.fn();
        expect(() => {
          item.apply(freshAddMappingNode, { onUpdate, openModal });
        }).not.toThrow();
      }
    });
  });
});
