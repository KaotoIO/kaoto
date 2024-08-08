Cypress.Commands.add('interactWithExpressionInputObject', (inputName: string, value?: string) => {
  cy.get('[data-ouia-component-id="ExpressionModal"]').within(() => {
    cy.interactWithConfigInputObject(inputName, value);
  });
});

Cypress.Commands.add('addExpressionResultType', (value: string) => {
  cy.get('[data-ouia-component-id="ExpressionModal"]').within(() => {
    cy.get('[data-fieldname="resultType"]').within(() => {
      cy.get(`input.pf-v5-c-text-input-group__text-input`).clear();
      cy.get(`input.pf-v5-c-text-input-group__text-input`).type(value).type('{enter}');
    });
  });
});

Cypress.Commands.add('checkExpressionResultType', (value: string) => {
  cy.get('[data-fieldname="resultType"]').within(() => {
    cy.get(`input.pf-v5-c-text-input-group__text-input`).should('have.value', value);
  });
});

Cypress.Commands.add('interactWithDataformatInputObject', (inputName: string, value?: string) => {
  cy.get('[data-testid="dataformat-config-card"]').within(() => {
    cy.interactWithConfigInputObject(inputName, value);
  });
});

Cypress.Commands.add('interactWithConfigInputObject', (inputName: string, value?: string) => {
  if (value !== undefined && value !== null) {
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).clear();
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).type(value);
  } else {
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).click();
  }
});

Cypress.Commands.add('checkConfigCheckboxObject', (inputName: string, value: boolean) => {
  const checked = value ? '' : 'not.';
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should(`${checked}be.checked`);
});

Cypress.Commands.add('checkConfigInputObject', (inputName: string, value: string) => {
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should('have.value', value);
});

Cypress.Commands.add('openExpressionModalBtn', () => {
  cy.get('[data-testid="launch-expression-modal-btn"]').scrollIntoView().should('be.visible').click();
});

Cypress.Commands.add('openExpressionModal', (expression: string) => {
  cy.get(`[data-fieldname="${expression}"]`)
    .scrollIntoView()
    .within(() => {
      cy.openExpressionModalBtn();
    });
});

Cypress.Commands.add('selectExpression', (expression: string) => {
  cy.get('div[data-ouia-component-id="ExpressionModal"] button.pf-v5-c-menu-toggle__button')
    .eq(0)
    .should('be.visible')
    .click();
  const regex = new RegExp(`^${expression}$`);
  cy.get('span.pf-v5-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});

Cypress.Commands.add('confirmExpressionModal', () => {
  cy.get('[data-testid="confirm-expression-modal-btn"]').should('be.visible').click();
});

Cypress.Commands.add('cancelExpressionModal', () => {
  cy.get('[data-testid="cancel-expression-modal-btn"]').should('be.visible').click();
});

Cypress.Commands.add('selectInTypeaheadField', (inputGroup: string, value: string) => {
  cy.get(`[data-fieldname="${inputGroup}"]`).within(() => {
    cy.get('button.pf-v5-c-menu-toggle__button').click();
  });
  cy.get(`#select-typeahead-${value}`).click();
});

Cypress.Commands.add('configureBeanReference', (inputName: string, value?: string) => {
  cy.get(`[data-fieldname="${inputName}"]`).scrollIntoView();
  cy.get(`[data-fieldname="${inputName}"] input`).click();
  cy.get(`[id$="${value}"]`).click();
  cy.get(`div[data-fieldname="${inputName}"] input[value="${value}"]`).should('exist');
});

Cypress.Commands.add('configureNewBeanReference', (inputName: string) => {
  cy.get(`[data-fieldname="${inputName}"]`).scrollIntoView();
  cy.get(`[data-fieldname="${inputName}"] input`).click();
  cy.get('#select-typeahead-kaoto-create-new').click();
});
Cypress.Commands.add('selectDataformat', (dataformat: string) => {
  cy.selectCustomMetadataEditor('dataformat', dataformat);
});

Cypress.Commands.add('selectCustomMetadataEditor', (type: string, format: string) => {
  cy.get(`div[data-testid="${type}-config-card"] div.pf-v5-c-menu-toggle button.pf-v5-c-menu-toggle__button`)
    .should('be.visible')
    .click();
  const regex = new RegExp(`^${format}$`);
  cy.get('span.pf-v5-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});

Cypress.Commands.add('configureDropdownValue', (inputName: string, value?: string) => {
  cy.configureBeanReference(inputName, value!);
});

Cypress.Commands.add('deselectNodeBean', (inputName: string) => {
  cy.get(`div[data-fieldname="${inputName}"] button[aria-label="Clear input value"]`).click();
});

Cypress.Commands.add('addProperty', (propertyName: string) => {
  cy.get('label')
    .contains(propertyName)
    .parent()
    .parent()
    .parent()
    .within(() => {
      cy.get('[data-testid="list-add-field"]').click();
    });
});

Cypress.Commands.add('addSingleKVProperty', (propertyName: string, key: string, value: string) => {
  cy.get('label')
    .contains(propertyName)
    .parent()
    .parent()
    .parent()
    .within(() => {
      cy.get('[data-testid="list-add-field"]').click();
      cy.get('input[label="Key"]').click();
      cy.get('input[label="Key"]').type(key);
      cy.get('input[label="Value"]').click();
      cy.get('input[label="Value"]').type(value);
    });
});

Cypress.Commands.add('filterFields', (filter: string) => {
  cy.get('[data-testid="filter-fields"]').within(() => {
    cy.get('input.pf-v5-c-text-input-group__text-input').type(filter);
  });
});

Cypress.Commands.add('selectFormTab', (value: string) => {
  cy.get(`[id$="${value}"]`).click();
});
