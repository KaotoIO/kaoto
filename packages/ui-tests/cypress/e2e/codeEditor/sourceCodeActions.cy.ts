describe('source code and drag and drop', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('loads the YAML editor and deletes steps, check with visualization', () => {
    cy.uploadFixture('flows/KafkaSourceSinkKB.yaml');
    cy.openDesignPage();
    cy.get('[data-id^="json-deserialize-action"]').should('exist');
    cy.openSourceCode();
    cy.editorDeleteLine(19, 5);

    // CHECK that the code editor contains the new timer source step
    cy.openDesignPage();
    cy.get('[data-id^="json-deserialize-action"]').should('not.exist');
  });

  it('User adds step to the YAML', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');

    const stepToInsert = `  steps:
  - ref:
      apiVersion: camel.apache.org/v1
      name: insert-field-action
      kind: Kamelet`;
    const insertLine = 10;
    cy.editorAddText(insertLine, stepToInsert);
    cy.openDesignPage();

    // CHECK the insert-field-action step was added
    cy.get('[data-type="node"][data-id^="insert-field-action"]').should('have.length', 1);
  });

  it('User removes step from the YAML', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');

    cy.editorDeleteLine(12, 6);
    cy.openDesignPage();
    // CHECK the kafka-sink step was removed
    cy.get('[data-type="node"][data-id^="sink: Unknown"]').should('have.length', 1);
  });

  it('User edits step in the YAML', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');

    cy.editorDeleteLine(13, 1);
    const name = `      name: aws-s3-sink`;
    cy.editorAddText(15, name);
    cy.openDesignPage();

    // CHECK the kafka-sink step was replaced by the aws s3 sink step
    cy.get('[data-type="node"][data-id^="kafka-sink"]').should('not.exist');
    cy.get('[data-type="node"][data-id^="aws-s3-sink"]').should('have.length', 1);
  });

  it('User Deletes branch in the YAML', () => {
    cy.uploadFixture('flows/ComplexKamelet.yaml');

    cy.editorDeleteLine(40, 7);
    cy.openDesignPage();

    // CHECK branch with digitalocean and set header step was deleted
    cy.get('[data-type="node"][data-id^="digitalocean"]').should('not.exist');
    cy.get('[data-type="node"][data-id^="setHeader"]').should('not.exist');
  });

  it('User Add a new branch in the YAML', () => {
    cy.uploadFixture('flows/ComplexKamelet.yaml');

    // CHECK atlasmap step is not
    // cy.openDesignPage();
    // cy.get('[data-type="node"][data-id^="atlasmap"]').should('have.length', 0);
    // cy.openSourceCode();

    const stepToInsert = `\n              - simple: '{{}{{}?test}}'
                steps:
                  - to:
                      uri: atlasmap:null`;
    const insertLine = 39;
    cy.editorAddText(insertLine, stepToInsert);
    cy.openDesignPage();

    // CHECK branch with atlasmap was created
    cy.get('[data-type="node"][data-id^="atlasmap"]').should('have.length', 1);
  });

  // Blocked by https://github.com/patternfly/patternfly-react/issues/9838
  // it('User undoes a change they saved, syncs with canvas', () => {
  //   cy.uploadFixture('flows/CamelRoute.yaml');

  //   cy.editorDeleteLine(31, 7);

  //   // CHECK branch with digitalocean and set header step was deleted
  //   cy.get('[data-testid="viz-step-digitalocean"]').should('not.exist');
  //   cy.get('[data-testid="viz-step-set-header"]').should('not.exist');

  //   // First click undo button => reverted automatic adjustments
  //   cy.editorClickUndoXTimes(1);
  //   // Second click undo button => changes reverted & alert is displayed
  //   cy.editorClickUndoXTimes(7);
  //   // CHECK alert is displayed
  //   cy.get('.pf-c-alert__title').contains(
  //     "Any invalid code will be replaced after sync. If you don't want to lose your changes please make a backup.",
  //   );

  //   // CHECK branch with digitalocean and set header step was deleted
  //   cy.get('[data-testid="viz-step-digitalocean"]').should('be.visible');
  //   cy.get('[data-testid="viz-step-set-header"]').should('be.visible');
  // });

  it('User uploads YAML file, syncs with canvas', () => {
    cy.uploadFixture('flows/TimerKafkaKB.yaml');
    cy.openDesignPage();

    // CHECK the kafka-sink and timer-source were imported
    cy.get('[data-type="node"][data-id^="kafka-sink"]').should('have.length', 1);
    cy.get('[data-type="node"][data-id^="timer-source"]').should('have.length', 1);
  });
});
