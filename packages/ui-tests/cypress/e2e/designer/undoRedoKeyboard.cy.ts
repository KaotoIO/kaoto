describe('Undo/Redo - Global keyboard shortcuts on Design page', () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openDesignPage();
  });

  it('Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z perform undo/redo when focus is not in a text input', () => {
    // Precondition: node exists
    cy.checkNodeExist('kafka-sink', 1);

    // Make a change: delete node
    cy.performNodeAction('kafka-sink', 'delete');
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="action-confirmation-modal-btn-confirm"]').length) {
        cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();
      }
    });
    cy.checkNodeExist('kafka-sink', 0);

    // Press Ctrl/Cmd+Z -> undo
    const isMac = Cypress.platform === 'darwin';
    const primary = isMac ? '{meta}' : '{ctrl}';
    cy.get('body').type(`${primary}z`);
    cy.checkNodeExist('kafka-sink', 1);

    // Press Ctrl/Cmd+Shift+Z -> redo
    cy.get('body').type(`${primary}{shift}z`);
    cy.checkNodeExist('kafka-sink', 0);
  });
});
