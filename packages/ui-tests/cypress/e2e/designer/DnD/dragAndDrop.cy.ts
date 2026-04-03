import 'cypress-real-events';

describe('Canvas nodes Drag and Drop', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  // FF not supported - https://github.com/dmtrKovalenko/cypress-real-events?tab=readme-ov-file#requirements
  it('D&D - basic drag and drop on edge', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.DnDOnEdge('route.from.steps.0.setHeader', 'camel-route|route.from.steps.1.marshal >>> route.from.steps.2.to');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/basic-updated.yaml');
  });

  it('D&D - basic drag and drop on Node', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.DnDOnNode('route.from.steps.0.setHeader', 'camel-route|route.from.steps.3.placeholder');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/basic-updated2.yaml');
  });

  it('D&D - drag and drop with node fields configured', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();

    cy.openStepConfigurationTab('setHeader');
    cy.selectFormTab('All');
    cy.interactWithConfigInputObject('name', 'testName');
    cy.interactWithExpressionInputObject('constant.id', 'testConstantId');
    cy.interactWithExpressionInputObject('constant.expression', 'testConstantExpression');
    cy.interactWithExpressionInputObject('constant.resultType', 'testConstantResultType');

    cy.DnDOnEdge('route.from.steps.0.setHeader', 'camel-route|route.from.steps.1.marshal >>> route.from.steps.2.to');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/basic-configured-updated.yaml');
  });

  it('D&D - drag and drop on Edge between two routes', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/multiflowDnD.yaml');
    cy.openDesignPage();

    cy.DnDOnEdge('route.from.steps.0.setHeader', 'route-4321|route.from.steps.0.marshal >>> route.from.steps.1.log');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/multiflowDnD-updated.yaml');
  });

  it('D&D - drag and drop with choice', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/complex.yaml');
    cy.openDesignPage();

    cy.toggleExpandGroup('when-setHeader');
    cy.toggleExpandGroup('when-log');

    cy.DnDOnNode('route.from.steps.0.choice.when.0', 'route.from.steps.0.choice.when.1');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/complex-dnd.yaml');
  });

  it('D&D - drag and drop on placeholder nodes between two routes', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/multiflowDnD.yaml');
    cy.openDesignPage();

    cy.DnDOnNode('route.from.steps.0.setHeader', 'route-4321|route.from.steps.2.placeholder');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/multiflowDnD-updated2.yaml');
  });

  it('D&D - drag when container onto another when (cross-route)', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/complexMultiFlow.yaml');
    cy.openDesignPage();

    cy.DnDOnNode('route-1|route.from.steps.0.choice.when.0|drag-handle', 'route-2|route.from.steps.0.choice.when.0');

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/complexMultiFlow-when-moved.yaml');
  });

  it('D&D - drag doTry container onto edge', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/doTry.yaml');
    cy.openDesignPage();

    cy.DnDOnEdge(
      'doTry-route|route.from.steps.2.doTry|drag-handle',
      'doTry-route|route.from.steps.0.setHeader >>> route.from.steps.1.marshal',
    );

    cy.get('[data-testid="Source Code"]').click({ force: true });
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/camelRoute/doTry-on-edge-moved.yaml');
  });
});
