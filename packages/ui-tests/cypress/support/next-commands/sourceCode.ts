import 'cypress-file-upload';

Cypress.Commands.add('waitForEditorToLoad', () => {
  cy.get('.pf-v5-c-code-editor').should(($editor) => {
    expect($editor.find('div:contains("Loading...")')).to.not.exist;
  });
});

Cypress.Commands.add('editorAddText', (line, text) => {
  cy.waitForEditorToLoad();
  cy.get('.pf-v5-c-code-editor')
    .click()
    .type('{ctrl}' + '{g}', { delay: 1 });
  // Select the line number where to insert the new text
  cy.get('input[aria-describedby="quickInput_message"]')
    .click()
    .type(`${line}` + '{enter}');
  // insert new line, so the new text can be added
  cy.focused().type('{enter}{upArrow}', { force: true, delay: 1 });
  text.split('\n').forEach((lineToWrite) => {
    cy.focused().type('{enter}{enter}{upArrow}', { force: true, delay: 1 });
    cy.focused().type('{ctrl}{l}', { force: true, delay: 1 });
    cy.focused().type(lineToWrite, { force: true, delay: 1 });
  });
});

Cypress.Commands.add('uploadFixture', (fixture) => {
  cy.openSourceCode();
  cy.waitForEditorToLoad();
  cy.get('.pf-v5-c-code-editor__main > input').attachFile(fixture);

  cy.get('.pf-v5-c-code-editor').should(($editor) => {
    expect($editor.find('[data-uri^="inmemory://"]')).to.exist;
  });
});

Cypress.Commands.add('editorDeleteLine', (line: number, repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  cy.waitForEditorToLoad();
  // Open the Go to Line dialog
  cy.get('.pf-v5-c-code-editor')
    .click()
    .type('{ctrl}' + '{g}', { delay: 1 });
  // Type the line number to delete
  cy.get('input[aria-describedby="quickInput_message"]')
    .click()
    .type(`${line + 1}` + '{enter}', { delay: 1 });

  // Delete the line as many times as specified
  for (let i = 0; i < repeatCount; i++) {
    cy.focused().type('{ctrl}{shift}{k}', { force: true, delay: 1 });
  }
});

Cypress.Commands.add('checkCodeSpanLine', (spanText: string, linesCount?: number) => {
  linesCount = linesCount ?? 1;
  cy.waitForEditorToLoad();
  cy.get('.pf-v5-c-code-editor').within(() => {
    cy.get('span:only-child').contains(spanText).should('have.length', linesCount);
  });
});

Cypress.Commands.add('checkMultiLineContent', (textContent: string[]) => {
  const modifiedTextContent: string[] = textContent.map((line) => {
    return line.replace(/\s/g, '\u00a0');
  });

  cy.get('.monaco-editor')
    .invoke('text')
    .then(($value) => {
      const linesArray = $value.split(/\s{4,}/).map((line) => line.trim());
      expect(linesArray).to.deep.include.members(modifiedTextContent);
    });
});

Cypress.Commands.add('editorScrollToTop', () => {
  cy.waitForEditorToLoad();
  cy.get('.pf-v5-c-code-editor').click().type('{ctrl}{home}', { release: false });
});

Cypress.Commands.add('editorClickUndoXTimes', (repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get('[data-testid="sourceCode--undoButton"]').click();
  });
});

Cypress.Commands.add('editorClickRedoXTimes', (repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get('[data-testid="sourceCode--redoButton"]').click();
  });
});

Cypress.Commands.add('compareFileWithMonacoEditor', (filePath: string) => {
  cy.waitForEditorToLoad();
  cy.fixture(filePath).then((fileContent) => {
    const fileLines = fileContent.split('\n').filter((line: string) => line.trim() !== '');

    fileLines.forEach((line: string) => {
      cy.get('.pf-v5-c-code-editor').within(() => {
        cy.get('span:only-child').contains(line.trim()).should('have.length', 1);
      });
    });
  });
});
