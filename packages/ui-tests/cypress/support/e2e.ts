// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './next-commands/datamapper';
import './next-commands/default';
import './next-commands/design';
import './next-commands/metadata';
import './next-commands/nodeConfiguration';
import './next-commands/sourceCode';

import { register as registerCypressGrep } from '@cypress/grep';

registerCypressGrep();

Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

Cypress.on('window:before:load', (win) => {
  let _monacoValue: typeof import('monaco-editor') | undefined;
  Object.defineProperty(win, 'monaco', {
    configurable: true,
    enumerable: true,
    get() {
      return _monacoValue;
    },
    set(val) {
      _monacoValue = val;
      if (val?.editor?.onDidCreateEditor) {
        val.editor.onDidCreateEditor((editor: { updateOptions: (opts: Record<string, unknown>) => void }) => {
          // Cypress doesn't support EditContext API - https://github.com/microsoft/monaco-editor/issues/5059
          editor.updateOptions({ editContext: false });
        });
      }
    },
  });

  // PF Popper uses setTimeout(0) to transition opacity from 0 to 1.
  // Headless Firefox doesn't reliably flush this state update to the DOM.
  const style = win.document.createElement('style');
  style.textContent = '[style*="opacity: 0"][style*="position: absolute"] { opacity: 1 !important; }';
  win.document.documentElement.appendChild(style);
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
