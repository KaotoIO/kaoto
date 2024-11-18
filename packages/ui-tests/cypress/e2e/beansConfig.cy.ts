import { selectors } from '@kaoto/kaoto/testing';

describe('Test for Bean support', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Beans - create a new bean using bean editor', () => {
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openBeans();
    cy.get(selectors.METADATA_ADD_BEANS_BTN).eq(0).click();
    cy.get(`input[name="name"]`).clear().type('test');
    cy.get(`input[name="type"]`).clear().type('org.acme');

    cy.openSourceCode();
    cy.checkCodeSpanLine('- beans:');
    cy.checkCodeSpanLine('- name: test');
    cy.checkCodeSpanLine('type: org.acme');

    cy.openBeans();
    cy.forceSelectMetadataRow(0);
    cy.addStringProperty('properties', 'test', 'value');
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
    cy.uploadFixture('flows/camelRoute/beans.yaml');

    cy.openBeans();

    cy.get('[data-testid="metadata-row-0"]').as('row');
    cy.get('@row').find('td').eq(0).should('contain', 'test');
    cy.get('@row').find('td').eq(1).should('contain', 'org.acme');
    cy.get('@row').click();

    cy.expandWrappedSection('properties');
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
    cy.uploadFixture('flows/camelRoute/beans.yaml');
    cy.openBeans();

    cy.get('[data-testid="metadata-row-0"]').click();
    cy.expandWrappedSection('properties');
    cy.get('[data-testid="properties-property-name-label"]').should('exist');
    cy.get('[data-testid="properties-property-value-label"]').should('exist');
    cy.get('[data-testid="properties-property-delete-property-btn"]').click();

    // CHECK the bean was edited in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('property: value', 0);
    cy.checkCodeSpanLine('properties: {}');
  });

  it('Beans - delete bean using the bean editor', () => {
    cy.uploadFixture('flows/camelRoute/beans.yaml');
    cy.openBeans();

    cy.get('[data-testid="metadata-delete-1-btn"]').click();
    cy.get('[data-testid="metadata-row-1"]').should('not.exist');

    // CHECK the first bean was deleted in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('- name: test2', 0);
    cy.checkCodeSpanLine('value: value', 0);

    cy.openBeans();
    cy.get('[data-testid="metadata-delete-0-btn"]').click();
    cy.get('[data-testid="metadata-row-0"]').should('not.exist');
    // CHECK the second bean was deleted in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('- name: test', 0);
    cy.checkCodeSpanLine('type: org.acme', 0);
  });
});
