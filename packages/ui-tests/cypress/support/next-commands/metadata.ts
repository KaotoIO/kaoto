import 'cypress-file-upload';
import { selectors } from '@kaoto/kaoto/testing';

Cypress.Commands.add('expandWrappedSection', (sectionName: string) => {
  cy.switchWrappedSection(sectionName, false);
});

Cypress.Commands.add('closeWrappedSection', (sectionName: string) => {
  cy.switchWrappedSection(sectionName, true);
});

Cypress.Commands.add('switchWrappedSection', (sectionName: string, wrapped: boolean) => {
  cy.get(`[data-testid="expandable-section-${sectionName}"]`)
    .should('be.visible')
    .within(() => {
      cy.get(selectors.EXPANDABLE_SECTION_TOGGLE).each(($button) => {
        if ($button.attr('aria-expanded') === String(wrapped)) {
          cy.wrap($button).click();
          cy.wrap($button).should('have.attr', 'aria-expanded', String(!wrapped));
        }
      });
    });
});

Cypress.Commands.add('forceSelectMetadataRow', (rowIndex: number) => {
  cy.get('input[name="name"]').then(($input) => {
    // Check if the input field is disabled
    if ($input.is(':disabled')) {
      cy.get(`[data-testid="metadata-row-${rowIndex}"]`).click();
      cy.get('input[name="name"]').then(($element) => {
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
  cy.contains('label', fieldName)
    .parent()
    .parent()
    .within(() => {
      cy.get(selectors.LIST_ADD_FIELD).click();
    });
});
