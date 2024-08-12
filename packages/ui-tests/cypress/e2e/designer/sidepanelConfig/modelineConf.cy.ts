describe('Tests for modeline', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Preserve modeline in pipe config after pipe source was changed', () => {
    cy.uploadFixture('flows/pipe/modeline.yaml');
    cy.openDesignPage();

    cy.removeNodeByName('https');
    cy.openStepConfigurationTab('kamelet:log-sink');
    cy.selectFormTab('All');
    cy.get(`input[name="parameters.showProperties"]`).check();

    cy.openSourceCode();
    cy.checkCodeSpanLine('# camel-k: dependency=camel:aws-secrets-manager', 1);
  });
});
