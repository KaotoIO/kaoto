import 'cypress-file-upload';
import { selectors } from '@kaoto/kaoto/testing';

Cypress.Commands.add('waitForEditorToLoad', () => {
  cy.get(selectors.CODE_EDITOR).should(($editor) => {
    expect($editor.find(selectors.LOADING)).to.not.exist;
  });
});

Cypress.Commands.add('editorAddText', (line, text) => {
  cy.waitForEditorToLoad();
  cy.get(selectors.CODE_EDITOR)
    .click()
    .type('{ctrl}' + '{g}', { delay: 1 });
  // Select the line number where to insert the new text
  cy.get(selectors.QUICK_INPUT_MESSAGE)
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
  cy.get(selectors.CODE_EDITOR_MAIN_INPUT).attachFile(fixture);

  cy.get(selectors.CODE_EDITOR).should(($editor) => {
    expect($editor.find(selectors.INMEMORY_URI)).to.exist;
  });
});

Cypress.Commands.add('editorDeleteLine', (line: number, repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  cy.waitForEditorToLoad();
  // Open the Go to Line dialog
  cy.get(selectors.CODE_EDITOR)
    .click()
    .type('{ctrl}' + '{g}', { delay: 1 });
  // Type the line number to delete
  cy.get(selectors.QUICK_INPUT_MESSAGE)
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
  cy.get(selectors.CODE_EDITOR).within(() => {
    cy.get(selectors.SPAN_ONLY_CHILD).contains(spanText).should('have.length', linesCount);
  });
});

Cypress.Commands.add('checkMultiLineContent', (textContent: string[]) => {
  const modifiedTextContent: string[] = textContent.map((line) => {
    return line.replace(/\s/g, '\u00a0');
  });

  cy.get(selectors.MONACO_EDITOR)
    .invoke('text')
    .then(($value) => {
      const linesArray = $value.split(/\s{4,}/).map((line) => line.trim());
      expect(linesArray).to.deep.include.members(modifiedTextContent);
    });
});

Cypress.Commands.add('editorScrollToTop', () => {
  cy.waitForEditorToLoad();
  cy.get(selectors.CODE_EDITOR).click().type('{ctrl}{home}', { release: false });
});

Cypress.Commands.add('editorClickUndoXTimes', (repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get(selectors.UNDO_BUTTON).click();
  });
});

Cypress.Commands.add('editorClickRedoXTimes', (repeatCount: number) => {
  repeatCount = repeatCount ?? 1;
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get(selectors.REDO_BUTTON).click();
  });
});

Cypress.Commands.add('compareFileWithMonacoEditor', (filePath: string) => {
  cy.waitForEditorToLoad();
  cy.fixture(filePath).then((fileContent) => {
    const fileLines = fileContent.split('\n').filter((line: string) => line.trim() !== '');

    fileLines.forEach((line: string) => {
      cy.get(selectors.CODE_EDITOR).within(() => {
        cy.get(selectors.SPAN_ONLY_CHILD).contains(line.trim()).should('have.length', 1);
      });
    });
  });
});
