describe('Tests for switching color scheme in the settings page', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User first enables the light mode and then switches to dark mode', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openSettings();
    cy.selectInTypeaheadField('colorScheme', 'light');
    cy.get('[data-testid="settings-form-save-btn"]').click();
    cy.waitSchemasLoading();
    cy.openDesignPage();

    cy.checkLightMode();

    cy.openSettings();
    cy.selectInTypeaheadField('colorScheme', 'dark');
    cy.get('[data-testid="settings-form-save-btn"]').click();
    cy.waitSchemasLoading();
    cy.openDesignPage();

    cy.checkDarkMode();
  });
});
