import 'cypress-file-upload';

Cypress.Commands.add('expandWrappedMetadataSection', (sectionName: string) => {
  cy.switchWrappedMetadataSection(sectionName, false);
});

Cypress.Commands.add('closeWrappedMetadataSection', (sectionName: string) => {
  cy.switchWrappedMetadataSection(sectionName, true);
});

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

Cypress.Commands.add('selectInSettingsTypeaheadField', (inputGroup: string, value: string) => {
  cy.get(`[data-fieldname="${inputGroup}"]`).within(() => {
    cy.get('button.pf-v6-c-menu-toggle__button').click();
  });
  cy.get(`#select-typeahead-${value}`).click();
});

Cypress.Commands.add('addMetadataField', (fieldName: string) => {
  cy.contains('label', fieldName)
    .parent()
    .parent()
    .within(() => {
      cy.get('[data-testid="list-add-field"]').click();
    });
});

Cypress.Commands.add('addMetadataStringProperty', (selector: string, key: string, value: string) => {
  cy.expandWrappedMetadataSection(selector);
  cy.get('[data-testid="properties-add-string-property--btn"]').not(':hidden').first().click({ force: true });
  cy.get('[data-testid="' + selector + '--placeholder-name-input"]').should('not.be.disabled');
  cy.get('[data-testid="' + selector + '--placeholder-name-input"]').click({ force: true });
  cy.get('[data-testid="' + selector + '--placeholder-name-input"]')
    .clear()
    .type(key);

  cy.get('[data-testid="' + selector + '--placeholder-value-input"]').should('not.be.disabled');
  cy.get('[data-testid="' + selector + '--placeholder-value-input"]').click({ force: true });
  cy.get('[data-testid="' + selector + '--placeholder-value-input"]')
    .clear()
    .type(value);
  cy.get('[data-testid="' + selector + '--placeholder-property-edit-confirm--btn"]').click({ force: true });
  cy.closeWrappedMetadataSection(selector);
});
