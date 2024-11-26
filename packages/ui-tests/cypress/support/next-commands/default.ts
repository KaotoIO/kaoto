Cypress.Commands.add('openHomePage', () => {
  const url = Cypress.config().baseUrl;
  cy.visit(url!);
  cy.waitSchemasLoading();

  cy.get('[data-testid="visualization-empty-state"]').should('exist');
  // Wait for the element to become visible
  cy.get('[data-testid="visualization-empty-state"]').should('be.visible');
});

Cypress.Commands.add('waitSchemasLoading', () => {
  // Wait for the loading schemas to disappear
  cy.get('[data-testid="loading-schemas"]').should('be.visible');
  cy.get('[data-testid="loading-schemas"]').should('not.exist');
  // Wait for the loading connectors to disappear
  cy.get('[data-testid="loading-catalogs"]').should('be.visible');
  cy.get('[data-testid="loading-catalogs"]').should('not.exist');
});

Cypress.Commands.add('expandVisualization', () => {
  cy.get('#Visualization').each(($element) => {
    const attributeValue = $element.attr('aria-expanded');
    if (attributeValue === 'false') {
      cy.wrap($element).click();
    }
  });
});

Cypress.Commands.add('openDesignPage', () => {
  cy.expandVisualization();
  cy.get('[data-testid="Design"]').click();
  cy.get('.pf-topology-container').should('be.visible');
});

Cypress.Commands.add('openSourceCode', () => {
  cy.expandVisualization();
  cy.get('[data-testid="Source Code"]').click();
  cy.get('.pf-v5-c-code-editor__code').should('be.visible');
});

Cypress.Commands.add('openBeans', () => {
  cy.get('[data-testid="Beans"]').click();
  cy.get('.metadata-editor-modal-details-view').should('be.visible');
});

Cypress.Commands.add('openMetadata', () => {
  cy.get('[data-testid="Metadata"]').click();
  cy.get('[data-testid="metadata-editor-form-Metadata"]').should('be.visible');
});

Cypress.Commands.add('openPipeErrorHandler', () => {
  cy.get('[data-testid="Pipe ErrorHandler"]').click();
});

Cypress.Commands.add('openTopbarKebabMenu', () => {
  cy.get('div.pf-v5-c-masthead__content').within(() => {
    cy.get('button.pf-v5-c-menu-toggle').click();
  });
});

Cypress.Commands.add('openSettings', () => {
  cy.openTopbarKebabMenu();
  cy.get('[data-testid="settings-link"]').click();
});

Cypress.Commands.add('openAboutModal', () => {
  cy.openTopbarKebabMenu();
  cy.get('button#about').click();
});

Cypress.Commands.add('closeAboutModal', () => {
  cy.get('.pf-v5-c-about-modal-box').within(() => {
    cy.get('button.pf-v5-c-button.pf-m-plain').click();
  });
});

Cypress.Commands.add('openCatalog', () => {
  cy.get('[data-testid="Catalog"]').click();
  cy.get('[data-testid="component-catalog-tab"]').should('be.visible');
});

/**
 * Select from integration type dropdown
 * Possible values are - Integration, camelYamlDsl(Camel Route), Kamelet, KameletBinding
 */
Cypress.Commands.add('switchIntegrationType', (type: string) => {
  cy.get('[data-testid="dsl-list-dropdown"]').click({ force: true });
  cy.get('#dsl-list-select').should('exist').find(`[data-testid="dsl-${type}"]`).should('exist').click();
  cy.get('[data-testid="confirmation-modal-confirm"]').click({ force: true });
});

Cypress.Commands.add('addNewRoute', () => {
  cy.get('[data-testid="new-entity-list-dropdown"]').click();
  cy.get('[data-testid="new-entity-route"]').click();
});

Cypress.Commands.add('toggleRouteVisibility', (index) => {
  cy.toggleFlowsList();
  cy.get('button[data-testid^="toggle-btn-route"]').then((buttons) => {
    cy.wrap(buttons[index]).click();
  });
  cy.closeFlowsListIfVisible();
});

Cypress.Commands.add('toggleFlowsList', () => {
  cy.get('[data-testid="flows-list-dropdown"]').click({ force: true });
});

Cypress.Commands.add('closeFlowsListIfVisible', () => {
  cy.get('body').then((body) => {
    if (body.find('[data-testid="flows-list-table"]').length > 0) {
      cy.get('[data-testid="flows-list-table"]').then(($element) => {
        if ($element.length > 0) {
          cy.toggleFlowsList();
        }
      });
    }
  });
});

Cypress.Commands.add('allignAllRoutesVisibility', (switchvisibility: string) => {
  cy.toggleFlowsList();
  cy.get('[data-testid="flows-list-table"]').then((body) => {
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
  cy.get('button[data-testid^="delete-btn-route"]').then((buttons) => {
    cy.wrap(buttons[index]).click();
  });
  cy.get('body').then(($body) => {
    if ($body.find('.pf-m-danger').length) {
      // Delete Confirmation Modal appeared, click on the confirm button
      cy.get('.pf-m-danger').click();
    }
  });
  cy.closeFlowsListIfVisible();
});

Cypress.Commands.add('cancelDeleteRoute', (index: number) => {
  cy.toggleFlowsList();
  cy.get('button[data-testid^="delete-btn-route"]').then((buttons) => {
    cy.wrap(buttons[index]).click();
  });
  cy.get('body').then(($body) => {
    if ($body.find('.pf-m-danger').length) {
      cy.get('[data-testid="action-confirmation-modal-btn-cancel"]').click();
    }
  });
  cy.closeFlowsListIfVisible();
});
