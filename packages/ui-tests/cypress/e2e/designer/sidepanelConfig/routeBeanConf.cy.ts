describe('Test for node bean reference and configuration support', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const testData = [
    { file: 'kamelet/sqlBeans.yaml', dataSource: '#bean:{{test}}' },
    { file: 'camelRoute/sqlBeans.yaml', dataSource: '#test' },
  ];
  testData.forEach((data) => {
    it('Beans - create a new bean in route using bean editor ' + data.file, () => {
      cy.uploadFixture('flows/' + data.file);
      cy.openDesignPage();

      cy.openStepConfigurationTab('sql');
      cy.configureNewBeanReference('parameters.dataSource');
      cy.get(`input[name="name"]`).clear().type('test');
      cy.get(`input[name="type"]`).clear().type('org.acme');

      cy.expandWrappedSection('properties');
      cy.get('[data-testid="properties-add-string-property--btn"]').not(':hidden').first().click({ force: true });
      cy.get('[data-testid="properties--placeholder-name-input"]').should('not.be.disabled');
      cy.get('[data-testid="properties--placeholder-name-input"]').click({ force: true });
      cy.get('[data-testid="properties--placeholder-name-input"]').clear().type('test');

      cy.get('[data-testid="properties--placeholder-value-input"]').should('not.be.disabled');
      cy.get('[data-testid="properties--placeholder-value-input"]').click({ force: true });
      cy.get('[data-testid="properties--placeholder-value-input"]').clear().type('value');

      cy.get('[data-testid="properties--placeholder-property-edit-confirm--btn"]').click({ force: true });

      cy.get('[data-testid="create-bean-btn"').click();
      cy.closeStepConfigurationTab();
      cy.openSourceCode();

      // CHECK the bean was created in the code editor
      cy.openSourceCode();
      cy.checkCodeSpanLine('- name: test');
      cy.checkCodeSpanLine('type: org.acme');
      cy.checkCodeSpanLine('properties:');
      cy.checkCodeSpanLine('test: value');
      // CHECK the bean is referenced in the code editor
      cy.checkCodeSpanLine('dataSource: "' + data.dataSource + '"');
    });
  });

  const newTestData = [
    { file: 'kamelet/sqlBeans.yaml', dataSource: '#bean:{{postgreSqlSource}}' },
    { file: 'camelRoute/sqlBeans.yaml', dataSource: '#postgreSqlSource' },
  ];
  newTestData.forEach((data) => {
    it('Beans - select existing bean in node form config ' + data.file, () => {
      cy.openSourceCode();
      cy.uploadFixture('flows/' + data.file);

      cy.openDesignPage();
      cy.openStepConfigurationTab('sql');
      cy.configureBeanReference('parameters.dataSource', data.dataSource);
      cy.openSourceCode();

      // CHECK the bean update was reflected in the code editor
      cy.checkCodeSpanLine('dataSource: "' + data.dataSource + '"');
    });

    it('Beans - unselect selected bean', () => {
      cy.openSourceCode();
      cy.uploadFixture('flows/' + data.file);

      cy.openDesignPage();
      cy.openStepConfigurationTab('sql');
      cy.configureBeanReference('parameters.dataSource', data.dataSource);
      cy.openSourceCode();
      cy.checkCodeSpanLine('dataSource: "' + data.dataSource + '"');

      cy.openDesignPage();
      cy.openStepConfigurationTab('sql');
      cy.deselectNodeBean('parameters.dataSource');
      cy.openSourceCode();
      cy.checkCodeSpanLine('dataSource: "' + data.dataSource + '"', 0);
    });
  });

  // blocked by https://github.com/KaotoIO/kaoto/issues/558
  it.skip('Beans - delete bean using the bean editor', () => {
    cy.uploadFixture('flows/camelRoute/sqlBeans.yaml');
    cy.openDesignPage();
    cy.openStepConfigurationTab('sql');
    cy.configureBeanReference('parameters.dataSource', 'postgreSqlSource');

    cy.openBeans();
    // Remove the bean
    cy.get('[data-testid="metadata-delete-1-btn"]').click();
    cy.get('[data-testid="metadata-row-1"]').should('not.exist');
    cy.openDesignPage();
    cy.openStepConfigurationTab('sql');
    cy.get(`div[data-fieldname="parameters.dataSource"] input[value="#postgreSqlSource"]`).should('not.exist');
  });
});
