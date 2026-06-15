import 'cypress-file-upload';

Cypress.Commands.add('waitForEditorToLoad', () => {
  cy.window().should((win) => {
    const models = win.monaco?.editor?.getModels?.();
    if (!models?.length) {
      throw new Error('Waiting for Monaco editor models to load');
    }
  });
});

Cypress.Commands.add('editorAddText', (line, text) => {
  cy.waitForEditorToLoad();
  cy.window().should((win) => {
    const models = win.monaco?.editor?.getModels?.();
    if (!models?.length || models[0].getLineCount() < line) {
      throw new Error(`Waiting for editor content (need line ${line})`);
    }
  });
  const editorTextarea = '.pf-v6-c-code-editor .monaco-editor textarea';
  cy.get('.pf-v6-c-code-editor .monaco-editor').click();
  cy.get(editorTextarea).type('{ctrl}{g}', { force: true, delay: 1 });
  cy.get('input[aria-describedby="quickInput_message"]').click();
  cy.get('input[aria-describedby="quickInput_message"]').type(`${line}` + '{enter}', { delay: 1 });
  cy.get(editorTextarea).type('{enter}{upArrow}', { force: true, delay: 20 });
  for (const lineToWrite of text.split('\n')) {
    cy.get(editorTextarea).type('{enter}{enter}{upArrow}{home}{shift}{end}' + lineToWrite, { force: true, delay: 20 });
  }
});

Cypress.Commands.add('uploadFixture', (fixture) => {
  cy.openSourceCode();
  cy.waitForEditorToLoad();
  cy.get('.pf-v6-c-code-editor__main input[type="file"]').attachFile(fixture);
  cy.waitForEditorToLoad();
  let lastContent = '';
  cy.window().should((win) => {
    const model = win.monaco?.editor?.getModels?.()?.[0];
    if (!model) throw new Error('No model');
    const content = model.getValue();
    if (content !== lastContent) {
      lastContent = content;
      throw new Error('Waiting for editor content to stabilize');
    }
  });
});

Cypress.Commands.add('editorDeleteLine', (line: number, repeatCount = 1) => {
  cy.waitForEditorToLoad();
  cy.window().should((win) => {
    const models = win.monaco?.editor?.getModels?.();
    if (!models?.length || models[0].getLineCount() <= line) {
      throw new Error(`Waiting for editor content (need line ${line})`);
    }
  });
  const editorTextarea = '.pf-v6-c-code-editor .monaco-editor textarea';
  cy.get('.pf-v6-c-code-editor .monaco-editor').click();
  cy.get(editorTextarea).type('{ctrl}{g}', { force: true, delay: 10 });
  cy.get('input[aria-describedby="quickInput_message"]').click();
  cy.get('input[aria-describedby="quickInput_message"]').type(`${line + 1}` + '{enter}', { delay: 10 });

  // Delete the line as many times as specified
  for (let i = 0; i < repeatCount; i++) {
    cy.get(editorTextarea).type('{ctrl}{shift}{k}', { force: true, delay: 10 });
  }
});

Cypress.Commands.add('getMonacoValue', () => {
  return cy.window().then((win) => {
    return cy
      .wrap(null)
      .should(() => {
        const [model] = win.monaco.editor.getModels() ?? [];
        if (!model) {
          throw new Error(`[Kaoto]: monaco-editor not found`);
        }
      })
      .then(() => {
        const [model] = win.monaco.editor.getModels() ?? [];
        const sourceCode = model.getValue();
        const eol = model.getEOL();
        return { sourceCode, eol };
      });
  });
});

Cypress.Commands.add('checkCodeSpanLine', (spanText: string, linesCount = 1) => {
  cy.waitForEditorToLoad();
  cy.get('.pf-v6-c-code-editor').within(() => {
    cy.get('span:only-child').contains(spanText).should('have.length', linesCount);
  });
});

Cypress.Commands.add('checkMultiLineContent', (textContent: string[]) => {
  const modifiedTextContent: string[] = textContent.map((line) => {
    return line.replace(/\s/g, '\u00a0');
  });

  // workaround for sporadic failures of basicXml.cy.ts on edge - https://github.com/KaotoIO/kaoto/issues/2278
  cy.get('.monaco-editor').invoke('text').should('not.be.empty', { timeout: 5000 });
  cy.get('.monaco-editor')
    .invoke('text')
    .should(($value: string) => {
      expect($value.split(/\s{2,}/).map((line: string) => line.trim()).length).to.be.greaterThan(
        modifiedTextContent.length,
      );
    });

  cy.get('.monaco-editor')
    .invoke('text')
    .then(($value) => {
      const linesArray = $value.split(/\s{2,}/).map((line) => line.trim());
      // deep include to check if all the lines are present in the editor
      expect(linesArray).to.deep.include.members(modifiedTextContent);
    });
});

Cypress.Commands.add('editorScrollToTop', () => {
  cy.waitForEditorToLoad();
  cy.get('.pf-v6-c-code-editor .monaco-editor').click();
  cy.focused().type('{ctrl}{home}', { force: true, release: false });
});

Cypress.Commands.add('editorScrollToMiddle', () => {
  cy.waitForEditorToLoad();
  cy.get('.pf-v6-c-code-editor').scrollTo('center', { ensureScrollable: false });
});

Cypress.Commands.add('editorClickUndoXTimes', (repeatCount = 1) => {
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get('[data-testid="sourceCode--undoButton"]').click();
  });
});

Cypress.Commands.add('editorClickRedoXTimes', (repeatCount = 1) => {
  Array.from({ length: repeatCount }).forEach(() => {
    return cy.get('[data-testid="sourceCode--redoButton"]').click();
  });
});

Cypress.Commands.add('compareFileWithMonacoEditor', (filePath: string) => {
  cy.waitForEditorToLoad();
  cy.fixture(filePath).then((fileContent) => {
    cy.getMonacoValue().then(({ sourceCode }) => {
      expect(sourceCode === fileContent).to.be.true;
    });
  });
});
