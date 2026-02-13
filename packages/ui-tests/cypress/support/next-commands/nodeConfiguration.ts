Cypress.Commands.add('interactWithConfigInputObject', (inputName: string, value?: string) => {
  cy.interactWithExpressionInputObject(`#.${inputName}`, value);
});

Cypress.Commands.add('interactWithExpressionInputObject', (inputName: string, value?: string, index?: number) => {
  index = index ?? 0;
  if (value !== undefined && value !== null) {
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).clear();
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).type(value);
  } else {
    /** We need to use {force:true} because the `Switch` component is wrapped by a label component, blocking the click event */
    cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).click({ force: true });
  }
});

Cypress.Commands.add('addExpressionResultType', (value: string, index?: number) => {
  index = index ?? 0;
  cy.get(`input.pf-v6-c-text-input-group__text-input`).clear();
  cy.get(`input.pf-v6-c-text-input-group__text-input`).type(value).type('{enter}');
});

Cypress.Commands.add('expandWrappedSection', (sectionName: string) => {
  cy.switchWrappedSection(sectionName, false);
});

Cypress.Commands.add('closeWrappedSection', (sectionName: string) => {
  cy.switchWrappedSection(sectionName, true);
});

Cypress.Commands.add('switchWrappedSection', (sectionName: string, wrapped: boolean) => {
  cy.get(`div[aria-labelledby^="${sectionName}"]`)
    .scrollIntoView()
    .within(() => {
      cy.get('button').each(($button) => {
        if ($button.attr('aria-expanded') === String(wrapped)) {
          cy.wrap($button).click();
          cy.wrap($button).should('have.attr', 'aria-expanded', String(!wrapped));
        }
      });
    });
});

Cypress.Commands.add('checkExpressionResultType', (value: string) => {
  cy.get('[data-fieldname="resultType"]').within(() => {
    cy.get(`input.pf-v6-c-text-input-group__text-input`).should('have.value', value);
  });
});

Cypress.Commands.add('checkConfigCheckboxObject', (inputName: string, value: boolean) => {
  const checked = value ? '' : 'not.';
  cy.get(`input[name="#.${inputName}"], textarea[name="#.${inputName}"]`).should(`${checked}be.checked`);
});

Cypress.Commands.add('checkExpressionConfigInputObject', (inputName: string, value: string) => {
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should('have.value', value);
});

Cypress.Commands.add('checkConfigInputObject', (inputName: string, value: string) => {
  cy.checkExpressionConfigInputObject(`#.${inputName}`, value);
});

Cypress.Commands.add('selectExpression', (expression: string, index?: number) => {
  index = index ?? 0;
  cy.get('[data-testid="#__expression-list-typeahead-select-input"]')
    .eq(index)
    .scrollIntoView()
    .should('be.visible')
    .within(() => {
      cy.get('input.pf-v6-c-text-input-group__text-input').click();
      cy.get('input.pf-v6-c-text-input-group__text-input').clear();
      cy.get('input.pf-v6-c-text-input-group__text-input').type(expression);
    });
  const regex = new RegExp(`^${expression}$`);
  cy.get('span.pf-v6-c-menu__item-text').contains(regex).should('exist').scrollIntoView().click();
});

Cypress.Commands.add('selectInTypeaheadField', (inputGroup: string, value: string) => {
  cy.get(`[data-testid="#.${inputGroup}-typeahead-select-input"]`).within(() => {
    cy.get('input.pf-v6-c-text-input-group__text-input').clear();
  });
  cy.get('.pf-v6-c-menu__item-text').contains(value).click();
});

Cypress.Commands.add('configureBeanReference', (inputName: string, value: string) => {
  cy.get(`[data-testid="#.${inputName}-typeahead-select-input"]`).scrollIntoView();
  cy.get(`[data-testid="#.${inputName}-typeahead-select-input"]`).click();
  cy.get('.pf-v6-c-menu__item-text').contains(value).first().click();
});

Cypress.Commands.add('configureNewBeanReference', (inputName: string) => {
  cy.get(`[data-testid="#.${inputName}-typeahead-select-input"]`).scrollIntoView();
  cy.get(`[data-testid="#.${inputName}-typeahead-select-input"]`).click();
  cy.get('.pf-v6-c-menu__item-text').contains('Create new bean').first().click();
});

Cypress.Commands.add('selectDataformat', (dataformat: string) => {
  cy.selectCustomMetadataEditor('dataformat', dataformat);
});

Cypress.Commands.add('selectCustomMetadataEditor', (type: string, format: string) => {
  cy.get(`div[data-testid="#__oneof-list-typeahead-select-input"]`).click();
  cy.get('.pf-v6-c-menu__item-text').contains(format).first().click();
});

Cypress.Commands.add('configureDropdownValue', (inputName: string, value?: string) => {
  cy.configureBeanReference(inputName, value!);
});

Cypress.Commands.add('deselectNodeBean', (inputName: string) => {
  cy.get(`button[data-testid="#.${inputName}__clear"][aria-label="Clear input value"]`).click();
});

Cypress.Commands.add('addProperty', (propertyName: string) => {
  cy.get(`[data-testid="#.${propertyName}"]`).click();
});

Cypress.Commands.add('addSingleKVProperty', (propertyName: string, key: string, value: string) => {
  cy.get(`[data-testid="#.${propertyName}__add"]`).click();
  cy.get(`input[name="#.${propertyName}.0.key"]`).type(key);
  cy.get(`input[name="#.${propertyName}.0.value"]`).type(value);
});

Cypress.Commands.add('filterFields', (filter: string) => {
  cy.get('[data-testid="filter-fields"]').within(() => {
    cy.get('input.pf-v6-c-text-input-group__text-input').clear();
    cy.get('input.pf-v6-c-text-input-group__text-input').type(filter);
  });
});

Cypress.Commands.add('selectFormTab', (value: string) => {
  cy.get('div.form-tabs').within(() => {
    cy.get(`[id$="${value}"]`).click();
  });
});

Cypress.Commands.add('specifiedFormTab', (value: string) => {
  cy.get('div.form-tabs').within(() => {
    cy.get(`[id$="${value}"]`).should('have.attr', 'aria-pressed', 'true');
  });
});

Cypress.Commands.add('addStringProperty', (selector: string, key: string, value: string) => {
  cy.get(`[data-testid="#.${selector}__add"]`).click();

  cy.get(`[data-testid="#.${selector}__key"]`)
    .first()
    .within(() => {
      cy.get(`input.pf-v6-c-text-input-group__text-input`).clear().type(key);
    });
  cy.get(`[data-testid="#.${selector}__value"]`)
    .first()
    .within(() => {
      cy.get(`input.pf-v6-c-text-input-group__text-input`).clear().type(value);
    });
});

Cypress.Commands.add('generateDocumentationPreview', () => {
  cy.get('[data-testid="documentationPreviewButton"]').click();
});

Cypress.Commands.add('documentationTableCompare', (routeName: string, expectedTableData: string[][]) => {
  cy.contains('h1', routeName)
    .next('table')
    .find('.pf-v6-c-table__tbody')
    .find('tr')
    .each(($row, rowIndex) => {
      cy.wrap($row)
        .find('td')
        .each(($cell, colIndex) => {
          cy.wrap($cell).should('have.text', expectedTableData[rowIndex][colIndex]);
        });
    });
});

Cypress.Commands.add('toggleMediaTypeField', (nodeName: string) => {
  cy.get(`[data-testid="#.${nodeName}__field-wrapper"]`).within(() => {
    cy.get('[data-testid="media-type-field-toggle"]').click();
  });
});

Cypress.Commands.add('selectMediaTypes', (nodeName: string, mediaType: string[]) => {
  cy.toggleMediaTypeField(nodeName);
  mediaType.forEach((type) => {
    cy.contains('.pf-v6-c-menu__item-text', type).click();
  });
  cy.toggleMediaTypeField(nodeName);
});
