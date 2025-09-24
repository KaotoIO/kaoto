import 'cypress-real-events';

describe('Canvas nodes Drag and Drop', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  // FF not supported - https://github.com/dmtrKovalenko/cypress-real-events?tab=readme-ov-file#requirements
  it('D&D - basic drag and drop', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.DnD('route.from.steps.0.setHeader', 'route.from.steps.1.marshal');

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- marshal:',
      'id: marshal-3801',
      '- setHeader:',
      'constant: test',
      'name: test',
      '- to:',
      'uri: log:test',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
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

    cy.DnD('route.from.steps.0.setHeader', 'route.from.steps.1.marshal');

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- marshal:',
      'id: marshal-3801',
      '- setHeader:',
      'constant:',
      'id: testConstantId',
      'expression: testConstantExpression',
      'resultType: testConstantResultType',
      'name: testName',
      '- to:',
      'uri: log:test',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
  });

  it('D&D - drag and drop between two routes', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/multiflowDnD.yaml');
    cy.openDesignPage();

    cy.DnD('route.from.steps.0.setHeader', 'route.from.steps.0.marshal');

    const yamlRoute = [
      'id: route-4321',
      'from:',
      'id: from-3576',
      'uri: timer:template',
      'parameters:',
      'period: "1000"',
      'steps:',
      '- marshal:',
      'id: marshal-4048',
      '- setHeader:',
      'id: setHeader-3105',
      'expression:',
      'simple: {}',
      '- log:',
      'id: log-2966',
      'message: ${body}',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
  });

  it('D&D - drag and drop with choice', { browser: '!firefox' }, () => {
    cy.uploadFixture('flows/camelRoute/complexMultiFlow.yaml');
    cy.openDesignPage();

    cy.DnD('route.from.steps.0.choice.when.0.steps.0.setHeader', 'route.from.steps.0.choice.when.1.steps.0.log');
    const yamlRoute = [
      '- description: when-log',
      'steps:',
      '- log:',
      'message: ${body}',
      '- setHeader:',
      'name: setHeader',
      'simple:',
      'expression: foo',
    ];
    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultiLineContent(yamlRoute);
  });
});
