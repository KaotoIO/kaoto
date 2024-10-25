describe('Tests for basic Catalog properties', () => {
  beforeEach(() => {
    cy.openHomePage();
  });
  const testData = [{ file: 'kamelet/basic.yaml' }, { file: 'camelRoute/basic.yaml' }];
  testData.forEach((data) => {
    it('Design - basic catalog properties for source/non-source elements', () => {
      cy.uploadFixture('flows/' + data.file);
      cy.openDesignPage();

      cy.selectReplaceNode('timer');
      cy.checkCatalogEntryExists('component', 'quartz');
      cy.checkCatalogEntryExists('component', 'webhook');
      cy.checkCatalogEntryExists('component', 'cron');
      cy.checkCatalogEntryExists('component', 'google-mail-stream');

      cy.checkCatalogEntryNotExists('component', 'arangodb');
      cy.checkCatalogEntryNotExists('component', 'aws-lambda-sink');
      cy.checkCatalogEntryNotExists('component', 'bean');
      cy.checkCatalogEntryNotExists('component', 'dns');
      cy.closeCatalogModal();

      cy.selectReplaceNode('marshal');
      cy.checkCatalogEntryNotExists('component', 'quartz');
      cy.checkCatalogEntryNotExists('component', 'webhook');
      cy.checkCatalogEntryNotExists('component', 'cron');
      cy.checkCatalogEntryNotExists('component', 'google-mail-stream');

      cy.checkCatalogEntryExists('component', 'arangodb');
      cy.checkCatalogEntryExists('component', 'aws-lambda-sink');
      cy.checkCatalogEntryExists('component', 'bean');
      cy.checkCatalogEntryExists('component', 'dns');
      cy.closeCatalogModal();
    });
  });
});
