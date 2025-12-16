import 'cypress-real-events';

describe('Test for DataMapper : datamapper node actions', { browser: '!firefox' }, () => {
  beforeEach(() => {
    cy.openHomePage();
    cy.allowClipboardAccess();
  });

  it('Datamapper - drag and drop datamapper step ', () => {
    cy.uploadFixture('flows/camelRoute/datamapper.yaml');
    cy.openDesignPage();
    cy.DnDOnEdge(
      'route.from.steps.2.step:kaoto-datamapper',
      'camel-route|route.from.steps.0.setHeader >>> route.from.steps.1.marshal',
    );

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- setHeader:',
      'constant: test',
      'name: test',
      '- step:',
      'id: kaoto-datamapper-69ab8b35',
      'steps:',
      '- to:',
      'id: kaoto-datamapper-xslt-3129',
      'uri: xslt-saxon',
      'parameters:',
      'failOnNullBody: false',
      '- marshal:',
      'id: marshal-3801',
      '- to:',
      'uri: log:test',
    ];
    cy.openSourceCode();
    cy.checkMultiLineContent(yamlRoute);
  });

  it('Datamapper - duplicate datamapper step', () => {
    cy.uploadFixture('flows/camelRoute/datamapper.yaml');
    cy.openDesignPage();

    cy.selectDuplicateNode('kaoto-datamapper');
    cy.checkNodeExist('kaoto-datamapper', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('kaoto-datamapper-69ab8b35', 2);
  });

  it('Datamapper - move datamapper steps', () => {
    cy.uploadFixture('flows/camelRoute/datamapper.yaml');
    cy.openDesignPage();

    cy.selectMoveAfterNode('kaoto-datamapper');

    cy.openSourceCode();

    const yamlRoute = [
      'id: camel-route',
      'from:',
      'uri: timer:test',
      'steps:',
      '- setHeader:',
      'constant: test',
      'name: test',
      '- marshal:',
      'id: marshal-3801',
      '- to:',
      'uri: log:test',
      '- step:',
      'id: kaoto-datamapper-69ab8b35',
      'steps:',
      '- to:',
      'id: kaoto-datamapper-xslt-3129',
      'uri: xslt-saxon',
      'parameters:',
      'failOnNullBody: false',
    ];
    cy.checkMultiLineContent(yamlRoute);
  });

  it('Datamapper - Cut and paste datamapper step', () => {
    cy.uploadFixture('flows/camelRoute/datamapper.yaml');
    cy.openDesignPage();

    cy.selectCopyNode('kaoto-datamapper');
    cy.selectPasteNode('setHeader', 'paste-as-next-step');
    cy.checkNodeExist('kaoto-datamapper', 2);

    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkMultipleCodeSpanEntry('kaoto-datamapper-69ab8b35', 2);
  });
});
