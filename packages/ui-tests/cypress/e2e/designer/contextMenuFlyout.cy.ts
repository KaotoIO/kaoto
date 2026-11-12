describe('Canvas context-menu flyouts', () => {
  [
    { width: 1400, height: 950 },
    { width: 900, height: 650 },
  ].forEach(({ width, height }) => {
    it(`keeps nested pointer actions readable and inside a ${width}x${height} viewport`, () => {
      cy.viewport(width, height);
      cy.openHomePage();
      cy.get('#canvas-main').rightclick(120, 140);
      cy.get('[role="menu"][aria-label="Canvas actions"]').then(($menu) => {
        const before = $menu[0].getBoundingClientRect();
        cy.contains('[role="menuitem"]', /^New$/).trigger('mouseover');
        cy.contains('[role="menuitem"]', /^Configuration$/).trigger('mouseover');
        cy.contains('[role="menuitem"]', /^Route Configuration/).should('be.visible');
        cy.get('[role="menu"][aria-label="Canvas actions"]').should(($root) => {
          const after = $root[0].getBoundingClientRect();
          expect(after.width).to.be.closeTo(before.width, 2);
          expect(after.height).to.be.closeTo(before.height, 2);
        });
        cy.contains('[role="menuitem"]', /^Route Configuration/)
          .closest('[role="menu"]')
          .should(($submenu) => {
            const bounds = $submenu[0].getBoundingClientRect();
            expect(bounds.width).to.be.greaterThan(250);
            expect(bounds.left).to.be.at.least(0);
            expect(bounds.top).to.be.at.least(0);
            expect(bounds.right).to.be.at.most(width);
            expect(bounds.bottom).to.be.at.most(height);
          });
      });
    });
  });
});
