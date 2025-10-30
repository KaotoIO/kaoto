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

    cy.get('[data-testid^="node-source-fj-string-AccountId"]').click();

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
      ['node-source-fj-map', 'node-source-fj-string-AccountId'],
      ['node-target-fj-map', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );
    cy.engageMapping(
      ['node-source-doc-param-OrderSequence'],
      ['node-target-fj-map', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId'], $OrderSequence",
    );
    cy.get('[data-testid^="mapping-link-"]').should('be.visible').first().click();

    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
    );

    cy.engageForEachMapping(
      ['node-source-fj-array', 'node-source-fj-map'],
      ['node-target-fj-map', 'node-target-fj-array-Item', 'node-target-fj-map'],
      '$Cart-x/fn:array/fn:map',
    );

    cy.engageMapping(
      ['node-source-fj-array', 'node-source-fj-map', 'node-source-fj-string-Title'],
      [
        'node-target-fj-map',
        'node-target-fj-array-Item',
        'node-target-for-each',
        'node-target-fj-map',
        'node-target-fj-string-Title',
      ],
      "fn:string[@key='Title']",
    );
    cy.engageMapping(
      ['node-source-fj-array', 'node-source-fj-map', 'node-source-fj-number-Quantity'],
      [
        'node-target-fj-map',
        'node-target-fj-array-Item',
        'node-target-for-each',
        'node-target-fj-map',
        'node-target-fj-number-Quantity',
      ],
      "fn:number[@key='Quantity']",
    );
    cy.engageMapping(
      ['node-source-fj-array', 'node-source-fj-map', 'node-source-fj-number-Price'],
      [
        'node-target-fj-map',
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
      ['node-source-fj-map', 'node-source-fj-string-AccountId'],
      ['node-target-fj-map', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );

    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
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
      ['node-source-fj-map', 'node-source-fj-string-AccountId'],
      ['node-target-fj-map', 'node-target-fj-string-OrderId'],
      "$Account-x/fn:map/fn:string[@key='AccountId']",
    );

    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-string-OrderPerson'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-string-Name'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Name'],
      "$Account-x/fn:map/fn:string[@key='Name']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Street'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Street'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Street']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-City'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-City'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='City']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-State'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-State'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='State']",
    );
    cy.engageMapping(
      ['node-source-fj-map', 'node-source-fj-map-Address', 'node-source-fj-string-Country'],
      ['node-target-fj-map', 'node-target-fj-map-ShipTo', 'node-target-fj-string-Country'],
      "$Account-x/fn:map/fn:map[@key='Address']/fn:string[@key='Country']",
    );

    cy.countMappingLines(7);

    cy.deleteParameter('Account');
    cy.countMappingLines(0);
  });
});
