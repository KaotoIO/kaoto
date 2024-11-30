import { selectors } from '@kaoto/kaoto/testing';

describe('Test for Pipe Error handler support', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('ErrorHandler - create a new errorHandler using errorHandler editor', () => {
    cy.uploadFixture('flows/kameletBinding/timerKafka.yaml');
    cy.openPipeErrorHandler();
    cy.get(selectors.MENU_TOGGLE_TOGGLE_ICON).click();
    cy.get('[data-testid="pipe-error-handler-select-option-log"]').click();
    cy.get(`input[name="log.parameters.maximumRedeliveries"]`).clear().type('5');
    cy.get(`input[name="log.parameters.redeliveryDelay"]`).clear().type('1000');

    cy.openSourceCode();
    cy.checkCodeSpanLine('errorHandler:');
    cy.checkCodeSpanLine('log:');
    cy.checkCodeSpanLine('parameters:');
    cy.checkCodeSpanLine('maximumRedeliveries: "5"');
    cy.checkCodeSpanLine('redeliveryDelay: "1000"');

    cy.openPipeErrorHandler();
    cy.get(selectors.MENU_TOGGLE_TOGGLE_ICON).click();
    cy.get('[data-testid="pipe-error-handler-select-option-sink"]').click();
    cy.get(`input[name="sink.endpoint.ref.kind"]`).clear().type('test-kind');
    cy.get(`input[name="sink.endpoint.ref.apiVersion"]`).clear().type('0.1-SNAPSHOT');
    cy.get(`input[name="sink.endpoint.ref.name"]`).clear().type('test-name');
    cy.get(`input[name="sink.endpoint.properties.message"]`).clear().type('test-message');
    cy.get(`input[name="sink.endpoint.properties.additionalProperties"]`).clear().type('test-additionalProperties');
    cy.get(`input[name="sink.parameters.maximumRedeliveries"]`).clear().type('3');
    cy.get(`input[name="sink.parameters.redeliveryDelay"]`).clear().type('2000');

    cy.openSourceCode();
    cy.checkCodeSpanLine('errorHandler:');
    cy.checkCodeSpanLine('sink:');
    cy.checkCodeSpanLine('parameters:');
    cy.checkCodeSpanLine('kind: test-kind');
    cy.checkCodeSpanLine('apiVersion: 0.1-SNAPSHOT');
    cy.checkCodeSpanLine('name: test-name');
    cy.checkCodeSpanLine('message: test-message');
    cy.checkCodeSpanLine('additionalProperties: test-additionalProperties');
    cy.checkCodeSpanLine('maximumRedeliveries: "3"');
    cy.checkCodeSpanLine('redeliveryDelay: "2000"');
  });

  it('ErrorHandler - edit in errorHandler editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openPipeErrorHandler();
    cy.get(`input[name="log.parameters.maximumRedeliveries"]`).clear().type('5');
    cy.get(`input[name="log.parameters.redeliveryDelay"]`).clear().type('1000');
    cy.openSourceCode();
    // CHECK the errorHandler update was reflected in the code editor
    cy.checkCodeSpanLine('maximumRedeliveries: "5"');
    cy.checkCodeSpanLine('redeliveryDelay: "1000"');
  });

  it('ErrorHandler - delete errorHandler properties using the ErrorHandler editor', () => {
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openPipeErrorHandler();

    cy.get(`input[name="log.parameters.maximumRedeliveries"]`).clear();
    cy.get(`input[name="log.parameters.redeliveryDelay"]`).clear();

    // CHECK the errorHandler was edited in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('maximumRedeliveries: ""');
    cy.checkCodeSpanLine('redeliveryDelay: ""');
  });

  it('ErrorHandler - select "no error handlers" - delete errorHandler', () => {
    cy.uploadFixture('flows/pipe/errorHandler.yaml');
    cy.openPipeErrorHandler();
    cy.get(selectors.MENU_TOGGLE_TOGGLE_ICON).click();
    cy.get('[data-testid="pipe-error-handler-select-option-none"]').click();
    // CHECK the first errorHandler was deleted in the code editor
    cy.openSourceCode();
    cy.checkCodeSpanLine('errorHandler:', 0);
  });
});
