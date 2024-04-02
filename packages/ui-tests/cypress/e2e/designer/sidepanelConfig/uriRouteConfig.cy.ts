describe('Test URI node config', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  const testFile = ['flows/kamelet/uriConf.yaml', 'flows/camelRoute/uriConf.yaml'];
  testFile.forEach((file) => {
    it('load the URI config route from ' + file + ', edit node in canvas and check', () => {
      cy.uploadFixture(file);

      cy.openDesignPage();

      cy.checkNodeExist('timer', 1);
      cy.checkNodeExist('setBody', 1);
      cy.checkNodeExist('log', 1);
      cy.checkNodeExist('transform', 1);
      cy.checkNodeExist('file', 1);

      cy.openStepConfigurationTab('timer');
      cy.checkConfigInputObject('parameters.period', '1000');
      cy.checkConfigInputObject('parameters.delay', '2000');
      cy.checkConfigInputObject('parameters.repeatCount', '10');

      cy.interactWithConfigInputObject('parameters.period', '3000');
      cy.interactWithConfigInputObject('parameters.repeatCount', '5');
      cy.closeStepConfigurationTab();

      // CHECK that the code editor contains the updated properties for timer step
      cy.openSourceCode();
      cy.checkCodeSpanLine('delay: 2000', 1);
      cy.checkCodeSpanLine('period: "3000"', 1);
      cy.checkCodeSpanLine('repeatCount: "5"', 1);
    });
  });

  it('User adds URI step to the YAML', () => {
    cy.uploadFixture('flows/kamelet/uriConf.yaml');
    const stepToInsert = `      - to: aws2-s3:testBucket?autoCreateBucket=true`;
    cy.editorAddText(43, stepToInsert);
    cy.openDesignPage();

    // CHECK the insert-field-action step was added
    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('setBody', 1);
    cy.checkNodeExist('log', 1);
    cy.checkNodeExist('transform', 1);
    cy.checkNodeExist('aws2-s3', 1);
    cy.checkNodeExist('file', 1);

    // CHECK the aws2-s3 properties
    cy.openStepConfigurationTab('aws2-s3');
    cy.checkConfigCheckboxObject('parameters.autoCreateBucket', true);
    cy.checkConfigInputObject('parameters.bucketNameOrArn', 'testBucket');
  });

  it('User adds URI step to the YAML', () => {
    cy.uploadFixture('flows/camelRoute/uriConf.yaml');
    const stepToInsert = `        - to: aws2-s3:testBucket?autoCreateBucket=true`;
    cy.editorAddText(11, stepToInsert);
    cy.openDesignPage();

    // CHECK the insert-field-action step was added
    cy.checkNodeExist('timer', 1);
    cy.checkNodeExist('setBody', 1);
    cy.checkNodeExist('log', 1);
    cy.checkNodeExist('transform', 1);
    cy.checkNodeExist('aws2-s3', 1);
    cy.checkNodeExist('file', 1);

    // CHECK the aws2-s3 properties
    cy.openStepConfigurationTab('aws2-s3');
    cy.checkConfigCheckboxObject('parameters.autoCreateBucket', true);
    cy.checkConfigInputObject('parameters.bucketNameOrArn', 'testBucket');
  });
});
