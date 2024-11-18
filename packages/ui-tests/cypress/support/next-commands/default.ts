import { selectors } from '@kaoto/kaoto/testing';

Cypress.Commands.add('openHomePage', () => {
  const url = Cypress.config().baseUrl;
  cy.visit(url!);
  cy.waitSchemasLoading();

  cy.get(selectors.VISUALIZATION_EMPTY_STATE).should('exist');
  // Wait for the element to become visible
  cy.get(selectors.VISUALIZATION_EMPTY_STATE).should('be.visible');
});

Cypress.Commands.add('waitSchemasLoading', () => {
  // Wait for the loading schemas to disappear
  cy.get(selectors.LOADING_SCHEMAS).should('be.visible');
  cy.get(selectors.LOADING_SCHEMAS).should('not.exist');
  // Wait for the loading connectors to disappear
  cy.get(selectors.LOADING_CATALOGS).should('be.visible');
  cy.get(selectors.LOADING_CATALOGS).should('not.exist');
});

Cypress.Commands.add('expandVisualization', () => {
  cy.get(selectors.VISUALIZATION).each(($element) => {
    const attributeValue = $element.attr('aria-expanded');
    if (attributeValue === 'false') {
      cy.wrap($element).click();
    }
  });
});

Cypress.Commands.add('openDesignPage', () => {
  cy.expandVisualization();
  cy.get(selectors.DESIGN).click();
  cy.get(selectors.TOPOLOGY_CONTAINER).should('be.visible');
});

Cypress.Commands.add('openSourceCode', () => {
  cy.expandVisualization();
  cy.get(selectors.SOURCE_CODE).click();
  cy.get(selectors.CODE_EDITOR_CODE).should('be.visible');
});

Cypress.Commands.add('openBeans', () => {
  cy.get(selectors.BEANS).click();
  cy.get(selectors.METADATA_EDITOR_MODAL_DETAIL).should('be.visible');
});

Cypress.Commands.add('openMetadata', () => {
  cy.get(selectors.METADATA).click();
  cy.get(selectors.METADATA_EDITOR_FORM).should('be.visible');
});

Cypress.Commands.add('openPipeErrorHandler', () => {
  cy.get(selectors.PIPE_ERRORHANDLER).click();
});

Cypress.Commands.add('openTopbarKebabMenu', () => {
  cy.get(selectors.TOPBAR).within(() => {
    cy.get(selectors.SETTINGS_KEBAB_BUTTON).click();
  });
});

Cypress.Commands.add('openSettings', () => {
  cy.openTopbarKebabMenu();
  cy.get(selectors.SETTINGS_LINK).click();
});

Cypress.Commands.add('openAboutModal', () => {
  cy.openTopbarKebabMenu();
  cy.get(selectors.BUTTON_ABOUT).click();
});

Cypress.Commands.add('closeAboutModal', () => {
  cy.get(selectors.ABOUT_MODAL_BOX).within(() => {
    cy.get(selectors.BUTTON_PLAIN).click();
  });
});

Cypress.Commands.add('openCatalog', () => {
  cy.get(selectors.CATALOG).click();
  cy.get(selectors.COMPONENT_CATALOG_TAB).should('be.visible');
});

/**
 * Select from integration type dropdown
 * Possible values are - Integration, camelYamlDsl(Camel Route), Kamelet, KameletBinding
 */
Cypress.Commands.add('switchIntegrationType', (type: string) => {
  cy.get(selectors.DSL_LIST_DROPDOWN).click({ force: true });
  cy.get(selectors.DSL_LIST_SELECT).should('exist').find(`[data-testid="dsl-${type}"]`).should('exist').click();
  cy.get(selectors.CONFIRMATION_MODAL_CONFIRM).click({ force: true });
});

Cypress.Commands.add('addNewRoute', () => {
  cy.get(selectors.NEW_ENTITY_LIST_DROPDOWN).click();
  cy.get(selectors.NEW_ENTITY_ROUTE).click();
});

Cypress.Commands.add('toggleRouteVisibility', (index) => {
  cy.toggleFlowsList();
  cy.get(selectors.TOGGLE_BUTTON_ROUTE).then((buttons) => {
    cy.wrap(buttons[index]).click();
  });
  cy.closeFlowsListIfVisible();
});

Cypress.Commands.add('toggleFlowsList', () => {
  cy.get(selectors.FLOWS_LIST_DROPDOWN).click({ force: true });
});

Cypress.Commands.add('closeFlowsListIfVisible', () => {
  cy.get('body').then((body) => {
    if (body.find(selectors.FLOWS_LIST_TABLE).length > 0) {
      cy.get(selectors.FLOWS_LIST_TABLE).then(($element) => {
        if ($element.length > 0) {
          cy.toggleFlowsList();
        }
      });
    }
  });
});

Cypress.Commands.add('allignAllRoutesVisibility', (switchvisibility: string) => {
  cy.toggleFlowsList();
  cy.get(selectors.FLOWS_LIST_TABLE).then((body) => {
    if (body.find(`svg[data-testid$="${switchvisibility}"]`).length > 0) {
      cy.get(`svg[data-testid$="${switchvisibility}"]`).then(($element) => {
        if ($element.attr('data-testid')?.endsWith(`${switchvisibility}`)) {
          cy.wrap($element[0]).click();
          cy.closeFlowsListIfVisible();
          cy.allignAllRoutesVisibility(switchvisibility);
        }
      });
    }
  });
  cy.closeFlowsListIfVisible();
});

Cypress.Commands.add('hideAllRoutes', () => {
  cy.allignAllRoutesVisibility('visible');
});

Cypress.Commands.add('showAllRoutes', () => {
  cy.allignAllRoutesVisibility('hidden');
});

Cypress.Commands.add('deleteRoute', (index: number) => {
  cy.toggleFlowsList();
  cy.get(selectors.DELETE_BUTTON_ROUTE).then((buttons) => {
    cy.wrap(buttons[index]).click();
  });
  cy.get('body').then(($body) => {
    if ($body.find(selectors.DANGER).length) {
      // Delete Confirmation Modal appeared, click on the confirm button
      cy.get(selectors.DANGER).click();
    }
  });
  cy.closeFlowsListIfVisible();
});
