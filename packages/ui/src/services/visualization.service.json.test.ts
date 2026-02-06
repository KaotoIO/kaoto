import {
  AddMappingNodeData,
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentNodeData,
  DocumentType,
  FieldItemNodeData,
  FieldNodeData,
  ForEachItem,
  IDocument,
  MappingNodeData,
  MappingTree,
  PrimitiveDocument,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  ValueSelector,
} from '../models/datamapper';
import {
  accountJsonSchema,
  camelYamlDslJsonSchema,
  cartJsonSchema,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
} from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { MappingSerializerService } from './mapping-serializer.service';
import { VisualizationService } from './visualization.service';

describe('VisualizationService / JSON', () => {
  const accountDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
    'Account.json': accountJsonSchema,
  });
  const accountResult = JsonSchemaDocumentService.createJsonSchemaDocument(accountDefinition);
  expect(accountResult.validationStatus).toBe('success');
  const accountDoc = accountResult.document!;
  const cartDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Cart', {
    'Cart.json': cartJsonSchema,
  });
  const cartResult = JsonSchemaDocumentService.createJsonSchemaDocument(cartDefinition);
  expect(cartResult.validationStatus).toBe('success');
  const cartDoc = cartResult.document!;
  const orderSequenceDoc = new PrimitiveDocument(
    new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'OrderSequence'),
  );
  const targetDefinition = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.JSON_SCHEMA,
    BODY_DOCUMENT_ID,
    { 'ShipOrder.json': shipOrderJsonSchema },
  );
  const result = JsonSchemaDocumentService.createJsonSchemaDocument(targetDefinition);
  expect(result.validationStatus).toBe('success');
  const targetDoc = result.document!;

  const sourceParameterMap = new Map<string, IDocument>([
    ['OrderSequence', orderSequenceDoc],
    ['Account', accountDoc],
    ['Cart', cartDoc],
  ]);

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
    expect(valueSelector.expression).toEqual("$Account-x/fn:map/fn:string[@key='Name']");

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
    expect(forEachItem.expression).toEqual('$Cart-x/fn:array/fn:map');

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
    expect(titleValueSelector.expression).toEqual("fn:string[@key='Title']");
  });

  it('should render deserialized mappings', () => {
    let mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
    mappingTree = MappingSerializerService.deserialize(shipOrderJsonXslt, targetDoc, mappingTree, sourceParameterMap);
    expect(mappingTree.children.length).toEqual(1);

    targetDocNode = new TargetDocumentNodeData(targetDoc, mappingTree);
    const targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    expect(targetChildren.length).toEqual(1);
    expect(targetChildren[0].title).toEqual('map');
    const targetMapChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetChildren[0]);
    expect(targetMapChildren.length).toEqual(4);

    const orderIdSelector = (targetMapChildren[0] as TargetFieldNodeData).mapping!.children[0] as ValueSelector;
    expect(orderIdSelector.expression).toEqual(
      "upper-case(concat('ORD-', $Account-x/fn:map/fn:string[@key='AccountId'], '-', $OrderSequence))",
    );
    const orderPersonSelector = (targetMapChildren[1] as TargetFieldNodeData).mapping!.children[0] as ValueSelector;
    expect(orderPersonSelector.expression).toEqual(
      "$Account-x/fn:map/fn:string[@key='AccountId'], ':', $Account-x/fn:map/fn:string[@key='Name']",
    );
    const shipToChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[2]);

    const nameSelector = (shipToChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(nameSelector.expression).toEqual("$Account-x/fn:map/fn:string[@key='Name']");
    const streetSelector = (shipToChildren[1] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(streetSelector.expression).toEqual("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']");
    const citySelector = (shipToChildren[2] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(citySelector.expression).toEqual("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']");
    const stateSelector = (shipToChildren[3] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(stateSelector.expression).toEqual("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']");
    const countrySelector = (shipToChildren[4] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(countrySelector.expression).toEqual("$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']");

    const itemArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(targetMapChildren[3]);
    expect(itemArrayChildren.length).toEqual(2);
    const forEach = (itemArrayChildren[0] as MappingNodeData).mapping as ForEachItem;
    expect(forEach.expression).toEqual('$Cart-x/fn:array/fn:map');
    const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(itemArrayChildren[0]);
    const forEachItemChildren = VisualizationService.generateNonDocumentNodeDataChildren(forEachChildren[0]);

    const titleSelector = (forEachItemChildren[0] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(titleSelector.expression).toEqual("fn:string[@key='Title']");
    const quantitySelector = (forEachItemChildren[1] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(quantitySelector.expression).toEqual("fn:number[@key='Quantity']");
    const priceSelector = (forEachItemChildren[2] as FieldItemNodeData).mapping.children[0] as ValueSelector;
    expect(priceSelector.expression).toEqual("fn:number[@key='Price']");

    expect(itemArrayChildren[1] instanceof AddMappingNodeData).toBeTruthy();
  });

  it('should generate nodes from Camel YAML DSL JSON schema', () => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.JSON_SCHEMA);
    const camelYamlDefinition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'CamelYamlDsl.json': camelYamlDslJsonSchema },
    );
    const result = JsonSchemaDocumentService.createJsonSchemaDocument(camelYamlDefinition);
    expect(result.validationStatus).toBe('success');
    const camelYamlDoc = result.document!;
    targetDocNode = new TargetDocumentNodeData(camelYamlDoc, mappingTree);
    const targetChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
    expect(targetChildren.length).toEqual(1);
    const topmostArray = targetChildren[0] as TargetFieldNodeData;
    expect(topmostArray.title).toEqual('array');

    const topmostArrayItem = VisualizationService.generateNonDocumentNodeDataChildren(topmostArray);
    expect(topmostArrayItem.length).toEqual(1);
    const topmostArrayMap = topmostArrayItem[0] as TargetFieldNodeData;
    expect(topmostArrayMap.title).toEqual('map');

    const entities = VisualizationService.generateNonDocumentNodeDataChildren(topmostArrayMap);
    expect(entities.length).toBeGreaterThan(10);

    const beansArray = entities.find((entity) => entity.title === 'array [@key = beans]') as TargetFieldNodeData;
    const beansArrayChildren = VisualizationService.generateNonDocumentNodeDataChildren(beansArray);
    expect(beansArrayChildren.length).toEqual(1);

    const beansEntity = beansArrayChildren[0] as TargetFieldNodeData;
    expect(beansEntity.title).toEqual('map');

    const beansProperties = VisualizationService.generateNonDocumentNodeDataChildren(beansEntity);
    expect(beansProperties.length).toBeGreaterThan(10);
  });
});
