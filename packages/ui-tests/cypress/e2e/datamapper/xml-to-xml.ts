describe('Test for DataMapper : XML to XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('attach schema, import mappings, select a mapping, export mappings and reset mappings', () => {
    cy.openDataMapper();
    cy.attachSourceBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.attachTargetBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/xsd/Account.xsd');
    cy.importMappings('datamapper/xslt/ShipOrderToShipOrder.xsl');

    cy.get('[data-testid^="node-source-fx-OrderId"]').click({ force: true });

    cy.checkFieldSelected('source', 'fx', 'OrderId', true);
    cy.checkFieldSelected('target', 'fx', 'OrderId', true);
    cy.checkMappingLineSelected(true);

    cy.exportMappings();
    cy.closeExportMappingsModal();
    cy.resetMappings();

    cy.checkFieldSelected('source', 'fx', 'OrderId', true);
    cy.checkFieldSelected('target', 'fx', 'OrderId', false);
    cy.checkMappingLineSelected(false);
  });

  it('Establish mappings by DnD', () => {
    cy.openDataMapper();
    cy.attachSourceBodySchema('datamapper/xsd/Cart.xsd');
    cy.attachTargetBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/xsd/Account.xsd');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fx-OrderId'],
      '$Account/ns0:Account/@AccountId',
    );

    // cypress complains that the line is go behind the source-target-view__line-blank, although
    // line is clickable when manually tested with chrome and firefox. adding "force: true" for now
    cy.get('[data-testid^="mapping-link-"]').should('be.visible').click({ force: true });

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Name'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Name'],
      '$Account/ns0:Account/Name',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Address'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Address'],
      '$Account/ns0:Account/Address',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-City'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-City'],
      '$Account/ns0:Account/City',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Country'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Country'],
      '$Account/ns0:Account/Country',
    );

    cy.engageForEachMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Item'],
      ['document-doc-targetBody-Body', 'node-target-fx-Item'],
      '/ns0:Cart/Item',
    );

    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Item', 'node-source-fx-Title'],
      ['document-doc-targetBody-Body', 'node-target-for-each', 'node-target-fx-Item', 'node-target-fx-Title'],
      'Title',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Item', 'node-source-fx-Note'],
      ['document-doc-targetBody-Body', 'node-target-for-each', 'node-target-fx-Item', 'node-target-fx-Note'],
      'Note',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Item', 'node-source-fx-Quantity'],
      ['document-doc-targetBody-Body', 'node-target-for-each', 'node-target-fx-Item', 'node-target-fx-Quantity'],
      'Quantity',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Item', 'node-source-fx-Price'],
      ['document-doc-targetBody-Body', 'node-target-for-each', 'node-target-fx-Item', 'node-target-fx-Price'],
      'Price',
    );

    cy.countMappingLines(10);
  });

  it('attach parameter schema, engage mappings, detach parameter schema', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/xsd/Account.xsd');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fx-OrderId'],
      '$Account/ns0:Account/@AccountId',
    );

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Name'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Name'],
      '$Account/ns0:Account/Name',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Address'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Address'],
      '$Account/ns0:Account/Address',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-City'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-City'],
      '$Account/ns0:Account/City',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Country'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Country'],
      '$Account/ns0:Account/Country',
    );

    cy.countMappingLines(5);

    cy.detachParameterSchema('Account');
    cy.countMappingLines(0);
  });

  it('attach parameter schema, engage mappings, delete parameter', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/xsd/Account.xsd');

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-AccountId'],
      ['document-doc-targetBody-Body', 'node-target-fx-OrderId'],
      '$Account/ns0:Account/@AccountId',
    );

    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Name'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Name'],
      '$Account/ns0:Account/Name',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Address'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Address'],
      '$Account/ns0:Account/Address',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-City'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-City'],
      '$Account/ns0:Account/City',
    );
    cy.engageMapping(
      ['document-doc-param-Account', 'node-source-fx-Country'],
      ['document-doc-targetBody-Body', 'node-target-fx-ShipTo', 'node-target-fx-Country'],
      '$Account/ns0:Account/Country',
    );

    cy.countMappingLines(5);

    cy.deleteParameter('Account');
    cy.countMappingLines(0);
  });
});
