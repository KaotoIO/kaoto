describe('Test for DataMapper : multiple schemas', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Datamapper - multiple schema', () => {
    cy.openDataMapper();
    cy.attachTargetBodySchema([
      'datamapper/xsd/MultiIncludeMain.xsd',
      'datamapper/xsd/MultiIncludeComponentA.xsd',
      'datamapper/xsd/MultiIncludeComponentB.xsd',
    ]);

    cy.attachSourceBodySchema('datamapper/xsd/Cart.xsd');

    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Title'],
      ['document-doc-targetBody-Body', 'node-target-fx-fieldA1'],
      '/ns0:Cart/Item/Title',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Note'],
      ['document-doc-targetBody-Body', 'node-target-fx-fieldA2'],
      '/ns0:Cart/Item/Note',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Quantity'],
      ['document-doc-targetBody-Body', 'node-target-fx-fieldB1'],
      '/ns0:Cart/Item/Quantity',
    );
    cy.engageMapping(
      ['document-doc-sourceBody-Body', 'node-source-fx-Price'],
      ['document-doc-targetBody-Body', 'node-target-fx-fieldB2'],
      '/ns0:Cart/Item/Price',
    );
    cy.countMappingLines(4);
  });

  it('Datamapper - multiple schema, missing required schemas', () => {
    cy.openDataMapper();
    cy.addTargetBodySchema(['datamapper/xsd/MultiIncludeMain.xsd']);

    cy.get('[data-testid="attach-schema-modal"]')
      .should('be.visible')
      .and(
        'contain.text',
        'Missing required schema: "MultiIncludeComponentA.xsd" referenced by "MultiIncludeMain.xsd" via xs:include',
      );
    cy.get('[data-testid="attach-schema-modal"]')
      .should('be.visible')
      .and(
        'contain.text',
        'Missing required schema: "MultiIncludeComponentB.xsd" referenced by "MultiIncludeMain.xsd" via xs:include',
      );
  });
});
