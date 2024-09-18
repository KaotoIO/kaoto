describe('Test for Metadata Editor support', () => {
  beforeEach(() => {
    cy.openHomePage();
  });

  it('Metadata Editor - edit metadata using metadata editor', () => {
    cy.uploadFixture('flows/kameletBinding/kafkaSourceSink.yaml');
    cy.openMetadata();

    cy.addStringProperty('annotations', 'test-annotations', 'value-annotations');
    cy.addStringProperty('labels', 'test-labels', 'value-labels');

    cy.get(`input[name="creationTimestamp"]`).clear().type('testCreationTimestamp');
    cy.get(`input[name="deletionGracePeriodSeconds"]`).clear().type('1000');
    cy.get(`input[name="deletionTimestamp"]`).clear().type('testDeletionTimestamp');
    cy.get(`input[name="generateName"]`).clear().type('testGenerateName');
    cy.get(`input[name="generation"]`).clear().type('10');
    cy.get(`input[name="name"]`).clear().type('testName');
    cy.get(`input[name="namespace"]`).clear().type('testNamespace');
    cy.get(`input[name="resourceVersion"]`).clear().type('testResourceVersion');
    cy.get(`input[name="selfLink"]`).clear().type('testSelfLink');
    cy.get(`input[name="uid"]`).clear().type('testUid');
    cy.addMetadataField('Finalizers');
    cy.get(`input[name="finalizers.0"]`).clear().type('finalizers-testFinalizer');

    cy.addMetadataField('Managed fields');
    cy.get(`input[name="managedFields.0.apiVersion"]`).clear().type('managedFields-apiVersion');
    cy.get(`input[name="managedFields.0.fieldsType"]`).clear().type('managedFields-fieldsType');
    cy.get(`input[name="managedFields.0.manager"]`).clear().type('managedFields-manager');
    cy.get(`input[name="managedFields.0.operation"]`).clear().type('managedFields-operation');
    cy.get(`input[name="managedFields.0.subresource"]`).clear().type('managedFields-subresource');
    cy.get(`input[name="managedFields.0.time"]`).clear().type('managedFields-time');

    cy.addMetadataField('Owner references');
    cy.get(`input[name="ownerReferences.0.apiVersion"]`).clear().type('ownerReferences-apiVersion');
    cy.get(`input[name="ownerReferences.0.blockOwnerDeletion"]`).check();
    cy.get(`input[name="ownerReferences.0.controller"]`).check();
    cy.get(`input[name="ownerReferences.0.kind"]`).clear().type('ownerReferences-kind');
    cy.get(`input[name="ownerReferences.0.name"]`).clear().type('ownerReferences-name');
    cy.get(`input[name="ownerReferences.0.uid"]`).clear().type('ownerReferences-uid');
    cy.openSourceCode();
    cy.editorScrollToTop();

    cy.checkCodeSpanLine('annotations:');
    cy.checkCodeSpanLine('test-annotations: value-annotations');
    cy.checkCodeSpanLine('labels:');
    cy.checkCodeSpanLine('test-labels: value-labels');
    cy.checkCodeSpanLine('name: testName');
    cy.checkCodeSpanLine('creationTimestamp: testCreationTimestamp');
    cy.checkCodeSpanLine('deletionTimestamp: testDeletionTimestamp');
    cy.checkCodeSpanLine('generateName: testGenerateName');
    cy.checkCodeSpanLine('generation: "10"');
    cy.checkCodeSpanLine('deletionGracePeriodSeconds: "1000"');
    cy.checkCodeSpanLine('namespace: testNamespace');
    cy.checkCodeSpanLine('resourceVersion: testResourceVersion');
    cy.checkCodeSpanLine('selfLink: testSelfLink');
    cy.checkCodeSpanLine('uid: testUid');

    cy.checkCodeSpanLine('finalizers:');
    cy.checkCodeSpanLine('- finalizers-testFinalizer');
    cy.checkCodeSpanLine('managedFields:');
    cy.checkCodeSpanLine('- apiVersion: managedFields-apiVersion');
    cy.checkCodeSpanLine('fieldsType: managedFields-fieldsType');
    cy.checkCodeSpanLine('manager: managedFields-manager');
    cy.checkCodeSpanLine('operation: managedFields-operation');
    cy.checkCodeSpanLine('subresource: managedFields-subresource');
    cy.checkCodeSpanLine('time: managedFields-time');
    cy.checkCodeSpanLine('ownerReferences:');
    cy.checkCodeSpanLine('- apiVersion: ownerReferences-apiVersion');
    cy.checkCodeSpanLine('kind: ownerReferences-kind');
    cy.checkCodeSpanLine('name: ownerReferences-name');
    cy.checkCodeSpanLine('uid: ownerReferences-uid');
    cy.checkCodeSpanLine('blockOwnerDeletion: true');
    cy.checkCodeSpanLine('controller: true');
  });

  it('Metadata Editor - create a new bean using editor and edit in bean editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/pipe/metadata.yaml');
    cy.openMetadata();

    cy.get(`input[name="creationTimestamp"]`).clear().type('updatedCreationTimestamp');
    cy.get(`input[name="deletionGracePeriodSeconds"]`).clear().type('2000');
    cy.get(`input[name="deletionTimestamp"]`).clear().type('updatedDeletionTimestamp');
    cy.get(`input[name="generateName"]`).clear().type('updatedGenerateName');
    cy.get(`input[name="generation"]`).clear().type('20');
    cy.get(`input[name="name"]`).clear().type('updatedName');
    cy.get(`input[name="namespace"]`).clear().type('updatedNamespace');
    cy.get(`input[name="resourceVersion"]`).clear().type('updatedResourceVersion');
    cy.get(`input[name="selfLink"]`).clear().type('updatedSelfLink');
    cy.get(`input[name="uid"]`).clear().type('updatedUid');

    cy.openSourceCode();
    cy.editorScrollToTop();
    // CHECK the bean update was reflected in the code editor
    cy.checkCodeSpanLine('name: updatedName');
    cy.checkCodeSpanLine('creationTimestamp: updatedCreationTimestamp');
    cy.checkCodeSpanLine('deletionTimestamp: updatedDeletionTimestamp');
    cy.checkCodeSpanLine('generateName: updatedGenerateName');
    cy.checkCodeSpanLine('generation: "20"');
    cy.checkCodeSpanLine('deletionGracePeriodSeconds: "2000"');
    cy.checkCodeSpanLine('namespace: updatedNamespace');
    cy.checkCodeSpanLine('resourceVersion: updatedResourceVersion');
    cy.checkCodeSpanLine('selfLink: updatedSelfLink');
    cy.checkCodeSpanLine('uid: updatedUid');
  });

  it('Metadata Editor - delete bean properties using the bean editor', () => {
    cy.openSourceCode();
    cy.uploadFixture('flows/pipe/metadata.yaml');
    cy.openMetadata();

    cy.expandWrappedSection('annotations');
    cy.get('[data-testid="annotations-annotation-name-name-label"]').should('exist');
    cy.get('[data-testid="annotations-annotation-name-value-label"]').should('exist');
    cy.get('[data-testid="annotations-annotation-name-delete-annotation-name-btn"]').click();
    cy.closeWrappedSection('labels');

    cy.expandWrappedSection('labels');
    cy.get('[data-testid="labels-label-name-name-label"]').should('exist');
    cy.get('[data-testid="labels-label-name-value-label"]').should('exist');
    cy.get('[data-testid="labels-label-name-delete-label-name-btn"]').click();
    cy.closeWrappedSection('labels');

    // CHECK the bean was edited in the code editor
    cy.openSourceCode();
    cy.editorScrollToTop();
    cy.checkCodeSpanLine('test-annotations: value-annotations', 0);
    cy.checkCodeSpanLine('test-labels: label-value', 0);
    cy.checkCodeSpanLine('annotations: {}');
    cy.checkCodeSpanLine('labels: {}');
  });
});
