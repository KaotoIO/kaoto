describe('Test for DataMapper', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('attach schema, import mappings, select a mapping, export mappings and reset mappings', () => {
    cy.openDataMapper();
    cy.attachSourceBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.attachTargetBodySchema('datamapper/xsd/ShipOrder.xsd');
    cy.importMappings('datamapper/xslt/ShipOrderToShipOrder.xsl');
    cy.addParameter('Account');
    cy.attachParameterSchema('Account', 'datamapper/xsd/Account.xsd');
    cy.get('[data-testid^="node-source-field-OrderId"]').click();

    cy.checkFieldSelected('source', 'OrderId', true);
    cy.checkFieldSelected('target', 'OrderId', true);
    cy.checkMappingLineSelected(true);

    cy.exportMappings();
    cy.closeExportMappingsModal();
    cy.resetMappings();

    cy.checkFieldSelected('source', 'OrderId', true);
    cy.checkFieldSelected('target', 'OrderId', false);
    cy.checkMappingLineSelected(false);
  });
});
