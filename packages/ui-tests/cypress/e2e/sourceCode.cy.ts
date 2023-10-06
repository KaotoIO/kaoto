describe('source code and drag and drop', () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
  });

  it('loads the YAML editor and deletes steps, check with visualization', () => {
    cy.openDesignPage();
    cy.get('[data-id^="json-deserialize-action"]').should('exist');
    cy.openSourceCode();
    cy.editorDeleteLine(19, 5);

    // CHECK that the code editor contains the new timer source step
    cy.openDesignPage();
    cy.get('[data-id^="json-deserialize-action"]').should('not.exist');
  });
});
