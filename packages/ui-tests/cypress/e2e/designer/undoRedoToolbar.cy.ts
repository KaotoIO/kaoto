describe('Undo/Redo - Design toolbar buttons', () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.openDesignPage();
  });

  it('toolbar buttons are disabled initially, enable on change, and undo/redo work', () => {
    // Initially no undo/redo available
    cy.get('button[aria-label="Undo"]').should('be.disabled');
    cy.get('button[aria-label="Redo"]').should('be.disabled');

    // Load a flow to make edits on
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openDesignPage();

    // Make a change in the canvas (delete a node)
    cy.checkNodeExist('kafka-sink', 1);
    cy.performNodeAction('kafka-sink', 'delete');
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="action-confirmation-modal-btn-confirm"]').length) {
        cy.get('[data-testid="action-confirmation-modal-btn-confirm"]').click();
      }
    });
    cy.checkNodeExist('kafka-sink', 0);

    // Undo should be enabled, redo disabled
    cy.get('button[aria-label="Undo"]').should('not.be.disabled');
    cy.get('button[aria-label="Redo"]').should('be.disabled');

    // Click Undo -> node returns
    cy.get('button[aria-label="Undo"]').click();
    cy.checkNodeExist('kafka-sink', 1);

    // Redo becomes enabled
    cy.get('button[aria-label="Redo"]').should('not.be.disabled');

    // Click Redo -> node is removed again
    cy.get('button[aria-label="Redo"]').click();
    cy.checkNodeExist('kafka-sink', 0);
  });
});
