import {
  BODY_DOCUMENT_ID,
  DocumentDefinitionType,
  DocumentNodeData,
  DocumentType,
  FieldNodeData,
  ForEachItem,
  MappingTree,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  ValueSelector,
} from '../models/datamapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { accountJsonSchema, cartJsonSchema, shipOrderJsonSchema } from '../stubs/datamapper/data-mapper';
import { VisualizationService } from './visualization.service';

describe('VisualizationService / JSON', () => {
  const accountDoc = JsonSchemaDocumentService.createJsonSchemaDocument(
    DocumentType.PARAM,
    'Account',
    accountJsonSchema,
  );
  const cartDoc = JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.PARAM, 'Cart', cartJsonSchema);
  const targetDoc = JsonSchemaDocumentService.createJsonSchemaDocument(
    DocumentType.TARGET_BODY,
    'ShipOrder',
    shipOrderJsonSchema,
  );

  let mappingTree: MappingTree;
  let cartDocNode: DocumentNodeData;
  let accountDocNode: DocumentNodeData;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
    cartDocNode = new DocumentNodeData(cartDoc);
    accountDocNode = new DocumentNodeData(accountDoc);
    targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
  });

  it('should engage JSON mapping', () => {
    const cartChildren = VisualizationService.generateStructuredDocumentChildren(cartDocNode);
    expect(cartChildren.length).toEqual(1);
    expect(cartChildren[0].title).toEqual('array');
    const cartArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(cartChildren[0]);
    expect(cartArrayChildren.length).toEqual(1);
    expect(cartArrayChildren[0].title).toEqual('map');
    const cartItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(cartArrayChildren[0]);
    expect(cartItemChildren.length).toEqual(4);

    const accountChildren = VisualizationService.generateStructuredDocumentChildren(accountDocNode);
    expect(accountChildren.length).toEqual(1);
    expect(accountChildren[0].title).toEqual('map');
    const accountMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(accountChildren[0]);
    expect(accountMapChildren.length).toEqual(3);

    let targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    expect(targetChildren.length).toEqual(1);
    expect(targetChildren[0].title).toEqual('map');
    let targetMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetChildren[0]);
    expect(targetMapChildren.length).toEqual(4);

    let itemArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[3]);
    expect(itemArrayChildren.length).toEqual(1);
    expect(itemArrayChildren[0].title).toEqual('map');

    expect(mappingTree.children.length).toEqual(0);
    expect(accountMapChildren[1].title).toEqual('string [@key = Name]');
    expect(targetMapChildren[1].title).toEqual('string [@key = OrderPerson]');
    VisualizationService.engageMapping(
      mappingTree,
      accountMapChildren[1] as FieldNodeData,
      targetMapChildren[1] as TargetNodeData,
    );
    const valueSelector = mappingTree.children[0].children[0].children[0] as ValueSelector;
    expect(valueSelector.expression).toEqual("$Account-x/xf:map/xf:string[@key='Name']");

    targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    targetMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetChildren[0]);
    itemArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[3]);
    VisualizationService.applyForEach(itemArrayChildren[0] as TargetFieldNodeData);

    targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    targetMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetChildren[0]);
    itemArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[3]);
    expect(itemArrayChildren[0].title).toEqual('for-each');
    VisualizationService.engageMapping(
      mappingTree,
      cartArrayChildren[0] as FieldNodeData,
      itemArrayChildren[0] as TargetNodeData,
    );
    const forEachItem = mappingTree.children[0].children[1].children[0] as ForEachItem;
    expect(forEachItem.expression).toEqual('$Cart-x/xf:array/xf:map');

    targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    targetMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetChildren[0]);
    itemArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[3]);
    const cartMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(cartArrayChildren[0]);
    expect(cartMapChildren[0].title).toEqual('string [@key = Title]');
    const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemArrayChildren[0]);
    expect(forEachChildren[0].title).toEqual('map');
    const forEachMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);
    expect(forEachMapChildren[0].title).toEqual('string [@key = Title]');
    VisualizationService.engageMapping(
      mappingTree,
      cartMapChildren[0] as FieldNodeData,
      forEachMapChildren[0] as TargetNodeData,
    );
    const titleValueSelector = mappingTree.children[0].children[1].children[0].children[0].children[0]
      .children[0] as ValueSelector;
    expect(titleValueSelector.expression).toEqual("xf:string[@key='Title']");
  });
});
