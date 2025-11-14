describe('Test for DataMapper : JSON to JSON', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('attach schema, import mappings, select a mapping, export mappings and reset mappings', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/jsonSchema/ShipOrder.schema.json');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/jsonSchema/Account.schema.json');
    cy.addParameter('Cart');
    cy.attachParameterSchema('Cart', 'datamapper/jsonSchema/Cart.schema.json');
    cy.addParameter('OrderSequence');
    cy.importMappings('datamapper/xslt/ShipOrderJson.xsl');

    cy.get('[data-testid^="node-source-fj-string-AccountId"]').click({ force: true });

    cy.checkFieldSelected('source', 'fj', 'string-AccountId', true);
    cy.checkFieldSelected('target', 'fj', 'string-OrderId', true);
    cy.checkMappingLineSelected(true);

    cy.exportMappings();
    cy.closeExportMappingsModal();
    cy.resetMappings();

    cy.checkFieldSelected('source', 'fj', 'string-AccountId', true);
    cy.checkFieldSelected('target', 'fj', 'string-OrderId', false);
    cy.checkMappingLineSelected(false);
  });

  it('Establish mappings by DnD', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/jsonSchema/ShipOrder.schema.json');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/jsonSchema/Account.schema.json');
    cy.addParameter('Cart');
    cy.attachParameterSchema('Cart', 'datamapper/jsonSchema/Cart.schema.json');
    cy.addParameter('OrderSequence');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );
    cy.engageMapping(
      ['document-doc-param-OrderSequence'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId'], $OrderSequence",
    );
    cy.get('[data-testid^="mapping-link-"]').should('be.visible').first().click({ force: true });

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
    );

    cy.engageForEachMapping(
      ['document-doc-param-Cart', 'node-source-fj-map'],
      ['document-doc-targetBody-Body', 'node-target-fj-array-Item', 'node-target-fj-map'],
      '$Cart-x/fn:array/fn:map',
    );

    cy.engageMapping(
      ['document-doc-param-Cart', 'node-source-fj-map', 'node-source-fj-string-Title'],
      [
        'document-doc-targetBody-Body',
        'node-target-fj-array-Item',
        'node-target-for-each',
        'node-target-fj-map',
        'node-target-fj-string-Title',
      ],
      "fn:string[@key='Title']",
    );
    cy.engageMapping(
      ['document-doc-param-Cart', 'node-source-fj-map', 'node-source-fj-number-Quantity'],
      [
        'document-doc-targetBody-Body',
        'node-target-fj-array-Item',
        'node-target-for-each',
        'node-target-fj-map',
        'node-target-fj-number-Quantity',
      ],
      "fn:number[@key='Quantity']",
    );
    cy.engageMapping(
      ['document-doc-param-Cart', 'node-source-fj-map', 'node-source-fj-number-Price'],
      [
        'document-doc-targetBody-Body',
        'node-target-fj-array-Item',
        'node-target-for-each',
        'node-target-fj-map',
        'node-target-fj-number-Price',
      ],
      "fn:number[@key='Price']",
    );

    cy.countMappingLines(12);
  });

  it('attach parameter schema, engage mappings, detach parameter schema', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/jsonSchema/ShipOrder.schema.json');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/jsonSchema/Account.schema.json');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
    );

    cy.countMappingLines(7);

    cy.detachParameterSchema('Account');
    cy.countMappingLines(0);
  });

  it('attach parameter schema, engage mappings, delete parameter', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/jsonSchema/ShipOrder.schema.json');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/jsonSchema/Account.schema.json');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-string-Name'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['document-doc-targetBody-Body', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
    );

    cy.countMappingLines(7);

    cy.deleteParameter('Account');
    cy.countMappingLines(0);
  });
});
