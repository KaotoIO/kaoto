describe('Test for Multi route actions from the code editor', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  // blocked ATM by https://github.com/KaotoIO/kaoto/issues/575
  it.skip('User creates a flow with missing route ID', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/malformed/camelRoute/missingId.yaml');
    cy.openDesignPage();

    cy.get('span[data-testid="flows-list-route-id"]').should('contain.text', 'route-');
    cy.get('span[data-testid="flows-list-route-id"]').should('contain.text', 'route-');
    cy.get('span[data-testid="flows-list-route-id"]')
      .invoke('text')
      .then((text) => {
        const routeIdText = text.trim();
        cy.openSourceCode();
        cy.checkCodeSpanLine(`id: ${routeIdText}`, 1);
      });
    // verify the route wasn't removed and left for the user to repair
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/malformed/missingIdRoute.yaml');
  });

  // blocked ATM by https://github.com/KaotoIO/kaoto/issues/683
  it.skip('User creates kameletBinding with missing kind definition', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/malformed/kamelet/missingKind.yaml');
    cy.openDesignPage();

    cy.checkNodeExist('timer-source', 0);
    cy.checkNodeExist('kafka-sink', 0);

    // verify the route wasn't removed and left for the user to repair
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/malformed/kamelet/missingKind.yaml');
  });

  it('User creates a flow with unknown node', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/malformed/camelRoute/unknownNode.yaml');
    cy.openDesignPage();
    cy.checkNodeExist('id', 1);
    cy.openStepConfigurationTab('id');
    cy.get('[data-ouia-component-id^="OUIA-Generated-Title"]').should('have.text', 'id');
    cy.closeStepConfigurationTab();
    // Related issue to provide more info https://github.com/KaotoIO/kaoto/issues/309
    // verify the route wasn't removed and left for the user to repair
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/malformed/camelRoute/unknownNode.yaml');
  });

  it('User creates a flow with wrongly indented node properties', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/malformed/kamelet/wrongIndentProperties.yaml');
    cy.openDesignPage();
    cy.checkNodeExist('source', 1);

    // verify the route wasn't removed and left for the user to repair
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/malformed/kamelet/wrongIndentProperties.yaml');
  });

  it('User creates a flow with wrongly indented source definition', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/malformed/kamelet/wrongIndentSource.yaml');
    cy.openDesignPage();
    cy.checkNodeExist('source', 1);
    cy.checkNodeExist('sink', 1);

    // verify the route wasn't removed and left for the user to repair
    cy.openSourceCode();
    cy.compareFileWithMonacoEditor('flows/malformed/kamelet/wrongIndentSource.yaml');
  });
});
