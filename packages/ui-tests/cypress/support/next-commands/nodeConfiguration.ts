import { KaotoFormPageObject } from '@kaoto/forms/testing/page-object';
import { configure, within } from '@testing-library/dom';

/** Let the page object's `findBy*` queries wait as long as a regular Cypress command */
configure({ asyncUtilTimeout: Cypress.config('defaultCommandTimeout') });

/**
 * Runs the callback with a {@link KaotoFormPageObject} bound to the application under test,
 * so the form selectors are maintained in a single place.
 */
const withKaotoForm = <T>(callback: (form: KaotoFormPageObject) => Promise<T>) =>
  cy
    .document()
    .then({ timeout: Cypress.config('defaultCommandTimeout') * 2 }, (doc) =>
      callback(new KaotoFormPageObject(within(doc.body), async (action) => action())),
    );

Cypress.Commands.add(
  'interactWithConfigInputObject',
  (inputName: string, value?: string, options?: Partial<Cypress.TypeOptions>) => {
    cy.interactWithExpressionInputObject(`#.${inputName}`, value, options);
  },
);

Cypress.Commands.add(
  'interactWithExpressionInputObject',
  (inputName: string, value?: string, options?: Partial<Cypress.TypeOptions>) => {
    if (value !== undefined && value !== null) {
      cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).clear();
      cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).type(value, options);
    } else {
      /** We need to use {force:true} because the `Switch` component is wrapped by a label component, blocking the click event */
      cy.get(`button[name="${inputName}"]`).click({ force: true });
    }
  },
);

Cypress.Commands.add('addExpressionResultType', (value: string) => {
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
  cy.get(`[data-testid^="${sectionName}"]`)
    .scrollIntoView()
    .within(() => {
      cy.get('button.cds--accordion__heading').each(($button) => {
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
  const checked = value ? 'true' : 'false';
  cy.get(`button[role="switch"][name="#.${inputName}"], button[role="switch"][id="#.${inputName}"]`).should(
    'have.attr',
    'aria-checked',
    checked,
  );
});

Cypress.Commands.add('checkExpressionConfigInputObject', (inputName: string, value: string) => {
  cy.get(`input[name="${inputName}"], textarea[name="${inputName}"]`).should('have.value', value);
});

Cypress.Commands.add('checkConfigInputObject', (inputName: string, value: string) => {
  cy.checkExpressionConfigInputObject(`#.${inputName}`, value);
});

Cypress.Commands.add('selectExpression', (expression: string, index = 0) => {
  cy.get('[data-testid="#__expression-list"]').eq(index).scrollIntoView().should('be.visible');
  cy.get('[data-testid="#__expression-list"]').eq(index).clear({ force: true }).type(expression);
  const regex = new RegExp(`^${expression}$`, 'i');
  cy.get('[role="listbox"]')
    .contains('.cds--list-box__menu-item__option span > span', regex)
    .should('exist')
    .scrollIntoView()
    .closest('[role="option"]')
    .click();
});

Cypress.Commands.add('selectInTypeaheadField', (inputGroup: string, value: string) => {
  cy.get(`[data-testid="#.${inputGroup}"]`).scrollIntoView();
  cy.get(`[data-testid="#.${inputGroup}"]`).click();
  cy.get('.cds--list-box__menu').contains(value).first().click();
});

Cypress.Commands.add('configureBeanReference', (inputName: string, value: string) => {
  cy.get(`[data-testid="#.${inputName}"]`).scrollIntoView();
  cy.get(`[data-testid="#.${inputName}"]`).click();
  cy.get('.cds--list-box__menu').contains(value).first().click();
});

Cypress.Commands.add('configureNewBeanReference', (inputName: string) => {
  cy.get(`[data-testid="#.${inputName}"]`).scrollIntoView();
  cy.get(`[data-testid="#.${inputName}"]`).click();
  cy.get('.cds--list-box__menu').contains('Create new bean').first().click();
});

Cypress.Commands.add('selectDataformat', (dataformat: string) => {
  cy.get(`[data-testid="#__oneof-list"]`).click();
  cy.get('.cds--list-box__menu').contains(dataformat).first().click();
});

Cypress.Commands.add('configureDropdownValue', (inputName: string, value?: string) => {
  cy.configureBeanReference(inputName, value!);
});

Cypress.Commands.add('deselectNodeBean', (inputName: string) => {
  withKaotoForm((form) => form.clearForProperty(`#.${inputName}`));
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
  withKaotoForm((form) => form.filterFields(filter));
});

Cypress.Commands.add('selectFormTab', (tab: Cypress.FormTab) => {
  withKaotoForm((form) => form.findTab(tab)).then((tabElement) => {
    cy.wrap(tabElement).click();
  });
});

Cypress.Commands.add('specifiedFormTab', (tab: Cypress.FormTab) => {
  withKaotoForm((form) => form.findTab(tab)).then((tabElement) => {
    cy.wrap(tabElement).should('have.attr', 'aria-selected', 'true');
  });
});

Cypress.Commands.add('addStringProperty', (selector: string, key: string, value: string) => {
  cy.get(`[data-testid="#.${selector}__add"]`).click();

  cy.get(`[data-testid="#.${selector}__key"]`).first().clear().type(key);
  cy.get(`[data-testid="#.${selector}__value"]`).first().clear().type(value);
});

Cypress.Commands.add('generateDocumentationPreview', () => {
  cy.get('[data-testid="documentationPreviewButton"]').click();
});

Cypress.Commands.add('documentationTableCompare', (routeName: string, expectedTableData: string[][]) => {
  // Wait until the loading distractor is no longer in the document
  cy.get('[data-testid="Loading markdown preview"]', { timeout: 120_000 }).should('not.exist');

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
    cy.get('[data-testid="media-type-field-toggle"] button.cds--list-box__field').click();
  });
});

Cypress.Commands.add('selectMediaTypes', (nodeName: string, mediaType: string[]) => {
  cy.toggleMediaTypeField(nodeName);
  mediaType.forEach((type) => {
    cy.contains('.cds--list-box__menu-item__option', type).click();
  });
  cy.toggleMediaTypeField(nodeName);
});
