import { selectors } from '@kaoto/kaoto/testing';

describe('Settings: About', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Close and reopen about modal', () => {
    cy.openAboutModal();
    cy.get(selectors.ABOUT_MODAL).should('be.visible');
    cy.closeAboutModal();
    cy.get(selectors.ABOUT_MODAL).should('not.exist');
  });

  it('Check that the about modal contains the correct information', () => {
    cy.openAboutModal();

    cy.get(selectors.ABOUT_MODAL).should('be.visible');

    cy.get('[alt="Kaoto Logo"]')
      .should('be.visible')
      .and(($img) => {
        expect($img[0].naturalWidth).to.be.greaterThan(0);
      });

    // Check the version
    cy.readFile('package.json').then((Package) => {
      cy.get(selectors.ABOUT_VERSION).should('have.text', Package.version);
    });

    // Check information Grid
    cy.get('dl > dt:first')
      .should('have.text', 'Version')
      .next()
      .should('have.attr', 'data-testid', 'about-version')
      .next()
      .next()
      .should('have.text', 'Build info')
      .next()
      .should('have.text', 'Git commit hash')
      .next()
      .should('have.attr', 'data-testid', 'about-git-commit-hash')
      .next()
      .should('have.text', 'Git last commit date')
      .next()
      .should('have.attr', 'data-testid', 'about-git-last-commit-date');
  });
});
