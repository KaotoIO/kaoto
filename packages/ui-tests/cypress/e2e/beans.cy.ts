describe('Test for Bean support', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Beans - create a new bean using the bean editor', () => {
    cy.uploadFixture('flows/CamelRoute.yaml');
    cy.openBeans();
    cy.get('[data-testid="metadata-add-Beans-btn"]').eq(0).click();
    cy.get(`input[name="name"]`).type('test');
    cy.get(`input[name="type"]`).type('org.acme');

    cy.get('[data-testid="expandable-section-properties"]').within(() => {
      cy.get('.pf-v5-c-expandable-section__toggle').click();
    });
    cy.get('[data-testid="properties-add-string-property--btn"]').not(':hidden').first().click({ force: true });
    cy.get('[data-testid="properties--placeholder-name-input"]').click();
    cy.get('[data-testid="properties--placeholder-name-input"]').clear().type('test');

    cy.get('[data-testid="properties--placeholder-value-input"]').click();
    cy.get('[data-testid="properties--placeholder-value-input"]').clear().type('value');

    cy.get('[data-testid="properties--placeholder-property-edit-confirm--btn"]').click();
    cy.openSourceCode();

    // CHECK the bean was created in the code editor
    cy.checkCodeSpanLine('- beans:');
    cy.checkCodeSpanLine('- name: test');
    cy.checkCodeSpanLine('type: org.acme');
    cy.checkCodeSpanLine('properties:');
    cy.checkCodeSpanLine('test: value');
  });

  it('Beans - create a new bean using editor and edit in bean editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/Beans.yaml');

    cy.openBeans();

    cy.get('[data-testid="metadata-row-0"]').as('row');
    cy.get('@row').find('td').eq(0).should('contain', 'test');
    cy.get('@row').find('td').eq(1).should('contain', 'org.acme');
    cy.get('@row').click();

    cy.get('[data-testid="expandable-section-properties"]').within(() => {
      cy.get('.pf-v5-c-expandable-section__toggle').click();
    });

    cy.get('[data-testid="properties-property-name-label"]').should('exist');
    cy.get('[data-testid="properties-property-value-label"]').should('exist');

    cy.get('[data-testid="properties-property-property-edit-property-btn"]').click();

    cy.get('[data-testid="properties-property-name-input"]').click();
    cy.get('[data-testid="properties-property-name-input"]').clear().type('property1');

    cy.get('[data-testid="properties-property-value-input"]').click();
    cy.get('[data-testid="properties-property-value-input"]').clear().type('value1');

    cy.get('[data-testid="properties-property-property-edit-confirm-property-btn"]').click();
    cy.openSourceCode();

    // CHECK the bean update was reflected in the code editor
    cy.checkCodeSpanLine('- beans:');
    cy.checkCodeSpanLine('- name: test');
    cy.checkCodeSpanLine('type: org.acme');
    cy.checkCodeSpanLine('properties:');
    cy.checkCodeSpanLine('property1: value1');
  });

  it('Beans - delete bean properties using the bean editor', () => {
    cy.uploadFixture('flows/Beans.yaml');
    cy.openBeans();

    cy.get('[data-testid="metadata-row-0"]').click();
    cy.get('[data-testid="expandable-section-properties"]').within(() => {
      cy.get('.pf-v5-c-expandable-section__toggle').click();
    });
    cy.get('[data-testid="properties-property-name-label"]').should('exist');
    cy.get('[data-testid="properties-property-value-label"]').should('exist');
    cy.get('[data-testid="properties-property-delete-property-btn"]').click();

    // CHECK the bean was edited in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('property: value', 0);
    cy.checkCodeSpanLine('properties: {}');
  });

  it('Beans - delete bean using the bean editor', () => {
    cy.uploadFixture('flows/Beans.yaml');
    cy.openBeans();

    cy.get('[data-testid="metadata-delete-1-btn"]').click();
    cy.get('[data-testid="metadata-row-1"]').should('not.exist');

    // CHECK the bean was deleted in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('- name: test2', 0);
    cy.checkCodeSpanLine('value: value', 0);
  });
});
