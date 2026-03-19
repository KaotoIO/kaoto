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
import './next-commands/datamapper';

import registerCypressGrep from '@cypress/grep/src/support';
registerCypressGrep();

Cypress.on('uncaught:exception', (_err, _runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

// Take screenshot after each test only when CAPTURE_SCREENSHOTS env var is set
// This is used by the manual screenshot workflow
// e2e.ts or your specific spec file
afterEach(function () {
  if (Cypress.env('CAPTURE_SCREENSHOTS')) {
    const testName = this.currentTest?.title || 'test';
    const suiteName = this.currentTest?.parent?.title || 'suite';

    // 1. Force the app to the exact resolution requested in the YAML
    cy.viewport(1366, 768);

    // 2. Surgical CSS injection:
    // This only lasts for the duration of the screenshot phase.
    // It hides all scrollbars and forces the app to snap to the viewport edges.
    cy.get('html, body, #root').invoke(
      'attr',
      'style',
      'overflow: hidden !important; height: 100vh !important; width: 100vw !important;',
    );

    // 3. Target the specific Kaoto/PatternFly main container to stop internal scrolling
    cy.get('.pf-v5-c-page__main').invoke('attr', 'style', 'overflow: hidden !important;');

    // Give the UI a split second to "snap" into place
    cy.wait(200);

    // 4. Take the shot of the APP ONLY (hides Cypress UI)
    cy.screenshot(`${suiteName} - ${testName}`, {
      capture: 'fullPage', // 'fullPage' captures the App Frame, 'viewport' captures the whole Browser
      scale: false,
    });

    // 5. Cleanup: Revert styles so the next test (if any) isn't broken
    cy.get('html, body, #root').invoke('attr', 'style', '');
  }
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
