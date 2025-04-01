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
  cy.get('input[name="#.name"]').then(($input) => {
    // Check if the input field is disabled
    if ($input.is(':disabled')) {
      cy.get(`[data-testid="metadata-row-${rowIndex}"]`).click();
      cy.get('input[name="#.name"]').then(($element) => {
        const attributeValue = $element.attr('disabled');
        if (attributeValue !== undefined) {
          let retryCount = 0;
          if (retryCount < 5) {
            retryCount++;
            cy.forceSelectMetadataRow(rowIndex);
          } else {
            return;
          }
        }
      });
    }
  });
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
