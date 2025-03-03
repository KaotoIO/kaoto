describe('Tests for Multi Value serialization', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Sidebar add Multi Value step configuration', () => {
    cy.uploadFixture('flows/camelRoute/multiValue.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('quartz');
    cy.selectFormTab('All');

    cy.filterFields('Job Parameters');
    cy.expandWrappedSection('#.parameters-Advanced');
    cy.addStringProperty('parameters.jobParameters', 'jobParametersTest', 'jobParametersValue');
    cy.filterFields('Trigger Parameters');
    cy.addStringProperty('parameters.triggerParameters', 'triggerParametersTest', 'triggerParametersValue');

    // CHECK changes are reflected in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('job.jobParametersTest: jobParametersValue');
    cy.checkCodeSpanLine('trigger.triggerParametersTest: triggerParametersValue');
  });

  it('Sidebar delete Multi Value step configuration', () => {
    cy.uploadFixture('flows/camelRoute/multiValue.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('quartz');
    cy.selectFormTab('All');

    cy.filterFields('Job Parameters');
    cy.expandWrappedSection('#.parameters-Advanced');
    cy.get('[data-testid="#.parameters.jobParameters__remove__testJob"]').not(':hidden').first().click({ force: true });

    cy.filterFields('Trigger Parameters');
    cy.expandWrappedSection('#.parameters-Advanced');
    cy.get('[data-testid="#.parameters.triggerParameters__remove__testTrigger"]')
      .not(':hidden')
      .first()
      .click({ force: true });

    cy.openSourceCode();
    cy.checkCodeSpanLine('job.testJob: testJob', 0);
    cy.checkCodeSpanLine('trigger.testTrigger: testTrigger', 0);
  });
});
