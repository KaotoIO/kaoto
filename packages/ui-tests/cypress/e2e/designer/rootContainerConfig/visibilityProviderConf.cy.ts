// e2e tests based on https://github.com/KaotoIO/kaoto/issues/2229
describe('Test for camel routes visibility provider', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Visibility provider - first route visible, rename second route through the Flow list, initial visibility is kept', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();

    cy.get(`span[title="route-1234"]`).should('be.visible');
    cy.get(`span[title="route-4321"]`).should('not.exist');

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);

    cy.renameRoute('route-4321', 'test');
    cy.get(`span[title="route-1234"]`).should('be.visible');
    cy.get(`span[title="test"]`).should('not.exist');
  });

  it('Visibility provider - second route visible, rename second route through the Flow list, initial visibility is kept', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="route-4321"]`).should('be.visible');

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);

    cy.renameRoute('route-4321', 'test');

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="test"]`).should('be.visible');
  });

  it('Visibility provider - second route visible, rename second route through the Form, initial visibility is kept', () => {
    cy.uploadFixture('flows/camelRoute/multiflow.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="route-4321"]`).should('be.visible');

    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('log', 1);

    cy.openGroupConfigurationTab('route-4321');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('id', 'test');

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="test"]`).should('be.visible');
  });

  it('Visibility provider - no route visible, delete a flow through the Flow list, first route is visible now', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(0);

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="route-4321"]`).should('not.exist');
    cy.get(`span[title="route-5678"]`).should('not.exist');

    cy.deleteRoute(2);

    cy.get(`span[title="route-1234"]`).should('be.visible');
    cy.get(`span[title="route-4321"]`).should('not.exist');
  });

  it('Visibility provider - second route is visible, delete the second flow through the Canvas, first route is visible now', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);

    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="route-4321"]`).should('be.visible');
    cy.get(`span[title="route-5678"]`).should('not.exist');

    cy.deleteRouteInCanvas('route-4321');

    cy.get(`span[title="route-1234"]`).should('be.visible');
    cy.get(`span[title="route-4321"]`).should('not.exist');
  });

  it('Visibility provider - second route is visible, go to the Document exporter, only the second flow is visible', () => {
    cy.uploadFixture('flows/camelRoute/threeRoutes.yaml');
    cy.openDesignPage();

    cy.toggleRouteVisibility(0);
    cy.toggleRouteVisibility(1);
    cy.get(`span[title="route-1234"]`).should('not.exist');
    cy.get(`span[title="route-4321"]`).should('be.visible');
    cy.get(`span[title="route-5678"]`).should('not.exist');

    cy.generateDocumentationPreview();

    const expectedCamelRouteTableData = [
      ['from-3576', 'from', 'timer:template', 'period', '1000'],
      ['log-2966', 'log', '', 'message', '${body}'],
    ];
    cy.documentationTableCompare('route-4321', expectedCamelRouteTableData);
  });
});
