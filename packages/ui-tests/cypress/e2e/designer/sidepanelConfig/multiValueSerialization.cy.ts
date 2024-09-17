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
    cy.expandWrappedSection('parameters.jobParameters');
    cy.get('[data-testid="properties-add-string-property--btn"]').not(':hidden').first().click({ force: true });
    cy.get('[data-testid="parameters.jobParameters--placeholder-name-input"]').should('not.be.disabled');
    cy.get('[data-testid="parameters.jobParameters--placeholder-name-input"]').click({ force: true });
    cy.get('[data-testid="parameters.jobParameters--placeholder-name-input"]').clear().type('jobParametersTest');

    cy.get('[data-testid="parameters.jobParameters--placeholder-value-input"]').should('not.be.disabled');
    cy.get('[data-testid="parameters.jobParameters--placeholder-value-input"]').click({ force: true });
    cy.get('[data-testid="parameters.jobParameters--placeholder-value-input"]').clear().type('jobParametersValue');
    cy.get('[data-testid="parameters.jobParameters--placeholder-property-edit-confirm--btn"]').click({ force: true });
    cy.closeWrappedSection('parameters.jobParameters');

    cy.filterFields('Trigger Parameters');
    cy.expandWrappedSection('parameters.triggerParameters');
    cy.get('[data-testid="properties-add-string-property--btn"]').not(':hidden').first().click({ force: true });
    cy.get('[data-testid="parameters.triggerParameters--placeholder-name-input"]').should('not.be.disabled');
    cy.get('[data-testid="parameters.triggerParameters--placeholder-name-input"]').click({ force: true });
    cy.get('[data-testid="parameters.triggerParameters--placeholder-name-input"]')
      .clear()
      .type('triggerParametersTest');

    cy.get('[data-testid="parameters.triggerParameters--placeholder-value-input"]').should('not.be.disabled');
    cy.get('[data-testid="parameters.triggerParameters--placeholder-value-input"]').click({ force: true });
    cy.get('[data-testid="parameters.triggerParameters--placeholder-value-input"]')
      .clear()
      .type('triggerParametersValue');
    cy.get('[data-testid="parameters.triggerParameters--placeholder-property-edit-confirm--btn"]').click({
      force: true,
    });
    cy.closeWrappedSection('parameters.triggerParameters');

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
    cy.expandWrappedSection('parameters.jobParameters');
    cy.get('[data-testid="parameters.jobParameters-testJob-delete-testJob-btn"]')
      .not(':hidden')
      .first()
      .click({ force: true });

    cy.filterFields('Trigger Parameters');
    cy.expandWrappedSection('parameters.triggerParameters');
    cy.get('[data-testid="parameters.triggerParameters-testTrigger-delete-testTrigger-btn"]')
      .not(':hidden')
      .first()
      .click({ force: true });

    cy.openSourceCode();
    cy.checkCodeSpanLine('job.testJob: testJob', 0);
    cy.checkCodeSpanLine('trigger.testTrigger: testTrigger', 0);
  });
});
