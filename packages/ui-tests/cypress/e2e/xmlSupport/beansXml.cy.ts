describe('Test for Bean support in XML', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('User creates a new bean using bean editor in XML', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
    cy.switchCodeToXml();

    cy.openBeans();

    cy.get('[data-testid="metadata-add-Beans-btn"]').eq(0).click();
    cy.get(`input[name="#.name"]`).clear().type('test');
    cy.get(`input[name="#.type"]`).clear().type('org.acme');
    cy.get(`input[name="#.initMethod"]`).clear().type('initMethodTest');
    cy.get(`input[name="#.destroyMethod"]`).clear().type('destroyMethodTest');
    cy.get(`input[name="#.factoryMethod"]`).clear().type('factoryMethodTest');

    cy.forceSelectMetadataRow(0);
    cy.addMetadataStringProperty('properties', 'test', 'value');

    const beansXml = [
      '<beans>',
      '<bean name="test" type="org.acme" initMethod="initMethodTest" destroyMethod="destroyMethodTest" factoryMethod="factoryMethodTest">',
      '<properties>',
      '<property key="test" value="value"/>',
      '</properties>',
      '</bean>',
    ];

    cy.openSourceCode();
    // CHECK the bean was created in the code editor
    cy.checkMultiLineContent(beansXml);
  });
});
