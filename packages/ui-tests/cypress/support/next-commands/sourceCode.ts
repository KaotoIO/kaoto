import 'cypress-file-upload';

Cypress.Commands.add('editorAddText', (line, text) => {
  text.split('\n').forEach((lineToWrite, i) => {
    cy.get('.pf-v5-c-code-editor')
      .click()
      .type('{pageUp}{pageUp}' + '{downArrow}'.repeat(line + i) + '{enter}{upArrow}' + lineToWrite, {
        delay: 1,
      });
  });
});

Cypress.Commands.add('uploadFixture', (fixture) => {
  cy.openSourceCode();
  cy.get('.pf-v5-c-code-editor__main > input').attachFile(fixture);
  cy.syncUpCodeChanges();
});

Cypress.Commands.add('syncUpCodeChanges', () => {
  cy.get('[data-testid="sourceCode--applyButton"]').click();
});

Cypress.Commands.add('editorDeleteLine', (line, repeatCount) => {
  repeatCount = repeatCount ?? 1;
  cy.get('.pf-v5-c-code-editor')
    .click()
    .type(
      '{pageUp}' +
        '{downArrow}'.repeat(line) +
        '{home}' +
        '{shift}' +
        '{downArrow}'.repeat(repeatCount) +
        '{backspace}',
      {
        delay: 1,
      },
    );
});

Cypress.Commands.add('checkCodeSpanLine', (spanText, linesCount) => {
  linesCount = linesCount ?? 1;
  cy.get('.pf-v5-c-code-editor').within(() => {
    cy.get('span:only-child').contains(spanText).should('have.length', linesCount);
  });
});

Cypress.Commands.add('editorScrollToTop', () => {
  cy.get('.pf-v5-c-code-editor').click().type('{ctrl}{home}', { release: false });
});
