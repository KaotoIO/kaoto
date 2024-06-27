describe('Tests for SpringBoot catalog type', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const runtime = 'SpringBoot';

  it('Camel SpringBoot catalog type with CR', () => {
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.hoverOnRuntime(runtime);
    cy.get(`[data-testid^="runtime-selector-Camel ${runtime}"]`).then(($element) => {
      const dataTestidValue = $element.attr('data-testid');
      const elementVersion = dataTestidValue!.substring(dataTestidValue!.lastIndexOf(' ') + 1);
      cy.selectAppendNode('setHeader');
      cy.checkCatalogVersion(elementVersion);
    });

    cy.chooseFromCatalog('component', 'as2');
    cy.checkNodeExist('as2', 1);

    cy.selectPrependNode('setHeader');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: as2', 1);
    cy.checkCodeSpanLine('log', 1);
  });

  it('Camel SpringBoot catalog type with Kamelet', () => {
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
