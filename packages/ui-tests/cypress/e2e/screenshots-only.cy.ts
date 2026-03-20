describe('Screenshots Only - Main Views', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('01 - Design Page - Empty Canvas', () => {
    cy.visit('/');
    cy.wait(1000); // Wait for page to fully load
  });

  it('02 - Design Page - With Route', () => {
    cy.visit('/');
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.wait(1000);
  });

  it('03 - Source Code View', () => {
    cy.visit('/');
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openSourceCode();
    cy.wait(1000);
  });

  it('04 - Catalog - Component Tab', () => {
    cy.visit('/');
    cy.openCatalog();
    cy.get('[data-testid="component-catalog-tab"]').click();
    cy.wait(1000);
  });

  it('05 - Catalog - Processor Tab', () => {
    cy.visit('/');
    cy.openCatalog();
    cy.get('[data-testid="processor-catalog-tab"]').click();
    cy.wait(1000);
  });

  it('06 - Catalog - Kamelet Tab', () => {
    cy.visit('/');
    cy.openCatalog();
    cy.get('[data-testid="kamelet-catalog-tab"]').click();
    cy.wait(1000);
  });

  it('07 - Settings Page', () => {
    cy.visit('/settings');
    cy.wait(1000);
  });

  it('08 - About Modal', () => {
    cy.visit('/');
    cy.openAboutModal();
    cy.wait(500);
  });

  it('09 - Step Configuration Panel', () => {
    cy.visit('/');
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openDesignPage();
    // Use the custom command to open step configuration
    cy.openStepConfigurationTab('timer-source');
    cy.wait(500);
  });

  it('10 - Metadata Editor', () => {
    cy.visit('/');
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
    cy.openMetadata();
    cy.wait(500);
  });

  it('11 - Beans Configuration', () => {
    cy.visit('/beans');
    cy.wait(1000);
  });

  it('12 - REST Configuration', () => {
    cy.visit('/rest');
    cy.wait(1000);
  });

  it('13 - Pipe Error Handler', () => {
    cy.visit('/');
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openPipeErrorHandler();
    cy.wait(500);
  });
});
