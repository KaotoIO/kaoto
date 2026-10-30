import 'cypress-file-upload';

Cypress.Commands.add('switchWrappedMetadataSection', (sectionName: string, wrapped: boolean) => {
  cy.get(`[data-testid="expandable-section-${sectionName}"]`)
    .should('be.visible')
    .within(() => {
      cy.get('.pf-v6-c-expandable-section__toggle').within(() => {
        cy.get('button').each(($button) => {
          if ($button.attr('aria-expanded') === String(wrapped)) {
            cy.wrap($button).click();
            cy.wrap($button).should('have.attr', 'aria-expanded', String(!wrapped));
          }
        });
      });
    });
});

Cypress.Commands.add('forceSelectMetadataRow', (rowIndex: number) => {
  // The details form is only rendered while a bean is selected
  cy.get(`[data-testid="metadata-row-${rowIndex}"]`).click();
  cy.get('input[name="#.name"]').should('not.be.disabled');
});

Cypress.Commands.add('addBeanUsingModal', (name: string, type: string) => {
  cy.contains('button', 'Actions').click();
  cy.get('[data-testid="metadata-add-Beans-btn"]').click();
  cy.get('[data-testid="bean-add-modal"]').within(() => {
    cy.interactWithConfigInputObject('name', name);
    cy.interactWithConfigInputObject('type', type);
  });
  cy.get('[data-testid="bean-add-modal-add-btn"]').click();
});

Cypress.Commands.add('addMetadataField', (fieldName: string) => {
  cy.get(`[data-testid="${fieldName}__add"]`).click();
});

Cypress.Commands.add('addMetadataStringProperty', (selector: string, key: string, value: string) => {
  cy.get('[data-testid="#.' + selector + '__add"]')
    .not(':hidden')
    .first()
    .click({ force: true });
  cy.get('[placeholder="Write a key"]').should('not.be.disabled');
  cy.get('[placeholder="Write a key"]').click({ force: true });
  cy.get('[placeholder="Write a key"]').clear().type(key);

  cy.get('[placeholder="Write a value"]').should('not.be.disabled');
  cy.get('[placeholder="Write a value"]').click({ force: true });
  cy.get('[placeholder="Write a value"]').clear().type(value);
});
