describe('Tests for Quarkus catalog type', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const runtime = 'Quarkus';

  it('Camel Quarkus catalog type with CR', () => {
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    // Verify the runtime selector displays Quarkus catalog
    cy.checkRuntimeDisplay(runtime);

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'as2');
    cy.checkNodeExist('as2', 1);

    cy.selectPrependNode('setHeader');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: as2', 1);
    cy.checkCodeSpanLine('log', 1);
  });

  it('Camel Quarkus catalog type with Kamelet', () => {
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectPrependNode('setBody');
    cy.chooseFromCatalog('component', 'as2');
    cy.checkNodeExist('as2', 1);

    cy.selectAppendNode('setBody');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: as2', 1);
    cy.checkCodeSpanLine('log', 1);
  });
});
