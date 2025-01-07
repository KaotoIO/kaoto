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
import './next-commands/default';
import './next-commands/sourceCode';
import './next-commands/nodeConfiguration';
import './next-commands/design';
import './next-commands/metadata';

import registerCypressGrep from '@cypress/grep/src/support';
registerCypressGrep();

Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
