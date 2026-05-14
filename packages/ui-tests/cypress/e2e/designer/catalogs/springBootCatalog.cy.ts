describe('Tests for SpringBoot catalog type', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const runtime = 'Spring Boot';

  it('Camel SpringBoot catalog type with CR', () => {
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    // Verify the runtime selector displays Spring Boot catalog
    cy.checkRuntimeDisplay(runtime);

    cy.selectAppendNode('setHeader');
    cy.chooseFromCatalog('component', 'spring-event');
    cy.checkNodeExist('spring-event', 1);

    cy.selectPrependNode('setHeader');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 2);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: spring-event', 1);
    cy.checkCodeSpanLine('log', 1);
  });

  it('Camel SpringBoot catalog type with Kamelet', () => {
    cy.selectRuntimeVersion(runtime);
    cy.uploadFixture('flows/kamelet/basic.yaml');
    cy.openDesignPage();

    cy.selectPrependNode('setBody');
    cy.chooseFromCatalog('component', 'spring-event');
    cy.checkNodeExist('spring-event', 1);

    cy.selectAppendNode('setBody');
    cy.chooseFromCatalog('processor', 'log');
    cy.checkNodeExist('log', 1);

    cy.openSourceCode();
    cy.checkCodeSpanLine('uri: spring-event', 1);
    cy.checkCodeSpanLine('log', 1);
  });
});
