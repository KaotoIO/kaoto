describe('Route Auto Startup switch', () => {
  const routeHeader = '[data-testid="camel-route|route|drag-handle"]';
  const autoStartupSwitch = `${routeHeader} .custom-group__autostart-switch`;

  beforeEach(() => {
    cy.openHomePage();
    cy.uploadFixture('flows/camelRoute/basic.yaml');
    cy.openDesignPage();
  });

  /**
   * The switch is rendered inside an SVG foreignObject. Positioned or transformed HTML there
   * is painted at the wrong coordinates in WebKit (bug 23113). PatternFly's switch styles come
   * from the lazily loaded switch chunk, after the canvas stylesheet, so the overrides must not
   * depend on stylesheet order.
   */
  it('does not create positioned or transformed layers inside the route header', () => {
    cy.get(autoStartupSwitch).should('be.visible');

    cy.get(autoStartupSwitch).then(([switchRoot]) => {
      const elements = [switchRoot, ...Array.from(switchRoot.querySelectorAll<HTMLElement>('*'))];
      elements.forEach((element) => {
        expect(getComputedStyle(element).position, `${element.className} position`).to.equal('static');
      });

      const toggle = switchRoot.querySelector('.pf-v6-c-switch__toggle')!;
      ['::before', '::after'].forEach((pseudo) => {
        const style = getComputedStyle(toggle, pseudo);
        expect(style.position, `toggle${pseudo} position`).to.equal('static');
        expect(style.transform, `toggle${pseudo} transform`).to.equal('none');
      });
    });
  });

  it('stays inside the route header and toggles autoStartup', () => {
    cy.get(routeHeader).then(([header]) => {
      const headerBox = header.getBoundingClientRect();
      cy.get(autoStartupSwitch).should(([switchRoot]) => {
        const switchBox = switchRoot.getBoundingClientRect();
        expect(switchBox.top).to.be.gte(headerBox.top);
        expect(switchBox.bottom).to.be.lte(headerBox.bottom);
        expect(switchBox.left).to.be.gte(headerBox.left);
        expect(switchBox.right).to.be.lte(headerBox.right);
      });
    });

    cy.get(autoStartupSwitch).find('input[role="switch"]').as('input');
    cy.get('@input').should('have.attr', 'aria-label', 'Auto Startup').and('be.checked');
    cy.get('@input').click();
    cy.get('@input').should('not.be.checked');

    cy.openSourceCode();
    cy.checkCodeSpanLine('autoStartup: false', 1);
  });
});
