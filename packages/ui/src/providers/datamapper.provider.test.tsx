import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { act, useContext, useEffect } from 'react';
import type { Mock } from 'vitest';

import { TargetPanel } from '../components/View/TargetPanel';
import { useDataMapper } from '../hooks/useDataMapper';
import { SendAlertProps } from '../models/datamapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  IField,
} from '../models/datamapper/document';
import { FieldItem, ForEachItem, MappingTree, ValueOfSelector, ValueSelector } from '../models/datamapper/mapping';
import { CanvasView } from '../models/datamapper/view';
import { TargetDocumentNodeData } from '../models/datamapper/visualization';
import { DocumentService } from '../services/document/document.service';
import { JsonSchemaField } from '../services/document/json-schema/json-schema-document.model';
import { MappingService } from '../services/mapping/mapping.service';
import { MappingSerializerService } from '../services/mapping/mapping-serializer.service';
import { MappingLinksService } from '../services/visualization/mapping-links.service';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import {
  getAccountJsonSchema,
  getAccountNameRequiredJsonSchema,
  getCartJsonSchema,
  getChoiceWithAbstractXsd,
  getFieldSubstitutionXsd,
  getShipOrderJsonSchema,
  getShipOrderJsonXslt,
  getShipOrderXsd,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { MappingLinksProvider } from './data-mapping-links.provider';
import { DataMapperContext, DataMapperProvider } from './datamapper.provider';

describe('DataMapperProvider', () => {
  it.each([
    {
      name: 'choice selections',
      schema: getChoiceWithAbstractXsd(),
      namespace: 'http://www.example.com/CHOICE_ABSTRACT',
      rootName: 'Notification',
      content:
        '<ns0:Short><ns0:id>123</ns0:id><ns0:Webhook><ns0:url>http://example.com</ns0:url></ns0:Webhook></ns0:Short>',
      metadataKey: 'choiceSelections' as const,
    },
    {
      name: 'field substitutions',
      schema: getFieldSubstitutionXsd(),
      namespace: 'http://www.example.com/SUBSTITUTION',
      rootName: 'Zoo',
      content: '<ns0:Nickname>test</ns0:Nickname>',
      metadataKey: 'fieldSubstitutions' as const,
    },
  ])('owns initialized definitions when detecting $name', ({ schema, namespace, rootName, content, metadataKey }) => {
    const targetDefinition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'target.xsd': schema },
      { namespaceUri: namespace, name: rootName },
      [],
      [],
      [],
    );
    const sourceDefinition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.Primitive,
      BODY_DOCUMENT_ID,
    );
    const parameterDefinition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'param');
    const initializationModel = new DocumentInitializationModel(
      { param: parameterDefinition },
      sourceDefinition,
      targetDefinition,
      { ns0: namespace },
    );
    const xslt = `<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="${namespace}">
      <xsl:template match="/"><ns0:${rootName}>${content}</ns0:${rootName}></xsl:template>
    </xsl:stylesheet>`;
    const { result } = renderHook(() => useDataMapper(), {
      wrapper: ({ children }) => (
        <DataMapperProvider documentInitializationModel={initializationModel} initialXsltFile={xslt}>
          {children}
        </DataMapperProvider>
      ),
    });

    const initializedTarget = result.current.targetBodyDocument.definition;
    expect(initializedTarget[metadataKey]?.length).toBeGreaterThan(0);
    expect(targetDefinition.choiceSelections).toEqual([]);
    expect(targetDefinition.fieldSubstitutions).toEqual([]);
    expect(initializationModel.namespaceMap).toEqual({ ns0: namespace });
    expect(initializedTarget).toBeInstanceOf(DocumentDefinition);
    expect(initializedTarget).not.toBe(targetDefinition);
    expect(initializedTarget.fieldTypeOverrides).not.toBe(targetDefinition.fieldTypeOverrides);
    expect(initializedTarget.rootElementChoice).not.toBe(targetDefinition.rootElementChoice);
    expect(initializedTarget.definitionFiles).not.toBe(targetDefinition.definitionFiles);
    expect(result.current.sourceBodyDocument.definition).not.toBe(sourceDefinition);
    expect(result.current.sourceParameterMap.get('param')?.definition).not.toBe(parameterDefinition);
  });

  it('notifies the host of initialization before child effects update mappings', () => {
    const onUpdateMappings = vi.fn();
    const onChildMount = vi.fn();
    const Child = () => {
      useEffect(() => {
        onChildMount();
      }, []);
      return null;
    };

    render(
      <DataMapperProvider onUpdateMappings={onUpdateMappings}>
        <Child />
      </DataMapperProvider>,
    );

    expect(onUpdateMappings.mock.invocationCallOrder[0]).toBeLessThan(onChildMount.mock.invocationCallOrder[0]);
  });

  it('should render', async () => {
    render(
      <DataMapperProvider>
        <div data-testid="testdiv" />
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('testdiv')).toBeInTheDocument();
  });

  it('refreshMappingTree should re-create the MappingTree instance', async () => {
    let prevTree: MappingTree;
    let nextTree: MappingTree;
    let done = false;
    const TestRefreshMappingTree = () => {
      const { mappingTree, refreshMappingTree } = useDataMapper();
      useEffect(() => {
        if (done) {
          nextTree = mappingTree;
        } else {
          prevTree = mappingTree;
          prevTree.children.push(new FieldItem(prevTree, {} as IField));
          refreshMappingTree();
          done = true;
        }
      }, [mappingTree, refreshMappingTree]);
      return <div data-testid="testdiv" />;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree />
      </DataMapperProvider>,
    );
    await screen.findByTestId('testdiv');
    expect(prevTree!).toBeDefined();
    expect(nextTree!).toBeDefined();
    expect(prevTree! !== nextTree!).toBeTruthy();
    expect(prevTree!.children[0] === nextTree!.children[0]).toBeTruthy();
  });

  it('resetMappingTree should reset the mappings', async () => {
    let initialized = false;
    let reset = false;
    let tree: MappingTree;
    const TestRefreshMappingTree = () => {
      const { mappingTree, refreshMappingTree, resetMappingTree } = useDataMapper();
      useEffect(() => {
        if (!initialized) {
          mappingTree.children.push(new FieldItem(mappingTree, {} as IField));
          refreshMappingTree();
          initialized = true;
        } else if (!reset) {
          resetMappingTree();
          reset = true;
        } else {
          tree = mappingTree;
        }
      }, [mappingTree, refreshMappingTree, resetMappingTree]);
      return <div data-testid="testdiv" />;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree />
      </DataMapperProvider>,
    );
    await waitFor(() => tree);
    expect(tree!.children).toHaveLength(0);
  });

  it('refreshSourceParameters should re-create the SourceParameters instance', async () => {
    let initialSourceParameterMap: Map<string, IDocument>;
    let newSourceParameterMap: Map<string, IDocument>;
    let done = false;
    const TestRefreshSourceParameters = () => {
      const { sourceParameterMap, refreshSourceParameters } = useDataMapper();
      useEffect(() => {
        if (done) {
          newSourceParameterMap = sourceParameterMap;
        } else {
          initialSourceParameterMap = sourceParameterMap;
          initialSourceParameterMap.set('testParam', {} as IDocument);
          refreshSourceParameters();
          done = true;
        }
      }, [refreshSourceParameters, sourceParameterMap]);
      return <div data-testid="testdiv" />;
    };
    render(
      <DataMapperProvider>
        <TestRefreshSourceParameters />
      </DataMapperProvider>,
    );
    await screen.findByTestId('testdiv');
    expect(initialSourceParameterMap!).toBeDefined();
    expect(newSourceParameterMap!).toBeDefined();
    expect(initialSourceParameterMap! !== newSourceParameterMap!).toBeTruthy();
    expect(initialSourceParameterMap!.get('testParam') === newSourceParameterMap!.get('testParam')).toBeTruthy();
  });

  it('refreshSourceParameters() should update the sourceParameters', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });
    // First add a parameter
    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});
    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
      path: { documentId: 'testParam' },
      fields: [] as IField[],
    } as IDocument;
    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'testParam');
    });
    // Verify it was added
    const originalMap = result.current.sourceParameterMap;
    expect(originalMap.has('testParam')).toBeTruthy();

    // Update the sourceParameterMap directly to simulate an external change
    originalMap.delete('testParam');
    originalMap.set('newTestParam', mockDocument);

    act(() => {
      result.current.refreshSourceParameters();
    });

    expect(originalMap.get('newTestParam')).toBeDefined();
    expect(originalMap.get('testParam')).toBeUndefined();
  });

  it("updateDocument() should also update MappingTree.documentDefinitionType if it's target body", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });
    expect(result.current!.mappingTree.documentDefinitionType).toBe(DocumentDefinitionType.Primitive);

    const docDef = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      'ShipOrderJson',
      { ShipOrderJson: getShipOrderJsonSchema() },
    );

    // Create a mock document - in practice this would come from DocumentService
    const mockDocument = {
      documentType: DocumentType.TARGET_BODY,
      documentId: 'ShipOrderJson',
      definitionType: DocumentDefinitionType.JSON_SCHEMA,
    } as IDocument;

    act(() => {
      result.current!.updateDocument(mockDocument, docDef, 'test');
    });

    await waitFor(() => {
      expect(result.current!.mappingTree.documentDefinitionType).toEqual(DocumentDefinitionType.JSON_SCHEMA);
    });
  });

  it('updateDocument() should update source body document', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'ShipOrder', {});

    const mockDocument = {
      documentType: DocumentType.SOURCE_BODY,
      documentId: 'Body',
      definitionType: DocumentDefinitionType.XML_SCHEMA,
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    expect(result.current.sourceBodyDocument).toEqual(mockDocument);
  });

  it('updateDocument() should update source parameter document', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});

    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();
    expect(result.current.sourceParameterMap.get('testParam')).toEqual(mockDocument);
  });

  it('updateDocument() should call onUpdateDocument callback if provided', async () => {
    const mockOnUpdateDocument = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onUpdateDocument={mockOnUpdateDocument}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});

    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    expect(mockOnUpdateDocument).toHaveBeenCalledWith(docDef);
  });

  it('sendAlert() should add alert to alerts array', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const alertProps = { variant: 'info' as const, title: 'Test alert' };

    expect(result.current.alerts).toHaveLength(0);

    act(() => {
      result.current.sendAlert(alertProps);
    });

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]).toEqual(alertProps);
  });

  it('deleteSourceParameter() should call onDeleteParameter callback if provided', async () => {
    const mockOnDeleteParameter = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onDeleteParameter={mockOnDeleteParameter}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    act(() => {
      result.current.deleteSourceParameter('testParam');
    });

    expect(mockOnDeleteParameter).toHaveBeenCalledWith('testParam');
  });

  it('deleteSourceParameter() should remove parameter from map', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    // First add a parameter
    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});

    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();

    // Then delete it
    act(() => {
      result.current.deleteSourceParameter('testParam');
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeFalsy();
  });

  it('renameSourceParameter() should renameDocument, renameParameterInMappings, and call onRenameParameter callback(if provided)', async () => {
    const mockOnRenameParameter = vi.fn();
    const renameDocSpy = vi.spyOn(DocumentService, 'renameDocument');
    const renameParameterInMappingsSpy = vi.spyOn(MappingService, 'renameParameterInMappings');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onRenameParameter={mockOnRenameParameter}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    // First add a parameter
    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});
    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
      path: { documentId: 'testParam' },
      fields: [] as IField[],
    } as IDocument;
    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });
    // Verify it was added
    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();

    act(() => {
      result.current.renameSourceParameter('testParam', 'newTestParam');
    });

    expect(renameDocSpy).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: DocumentType.PARAM }),
      'newTestParam',
    );
    expect(renameParameterInMappingsSpy).toHaveBeenCalledWith(result.current.mappingTree, 'testParam', 'newTestParam');
    expect(mockOnRenameParameter).toHaveBeenCalledWith('testParam', 'newTestParam');
  });

  it('renameSourceParameter() should rename parameter in the map and mappings', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    // First add a parameter
    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});
    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
      path: { documentId: 'testParam' },
      fields: [] as IField[],
    } as IDocument;
    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });
    // Verify it was added
    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();

    // Then rename it
    act(() => {
      result.current.renameSourceParameter('testParam', 'newTestParam');
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeFalsy();
    expect(result.current.sourceParameterMap.has('newTestParam')).toBeTruthy();
  });

  it('setSourceParametersExpanded() should update expanded state', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    // Default should be true
    expect(result.current.isSourceParametersExpanded).toBeTruthy();

    act(() => {
      result.current.setSourceParametersExpanded(false);
    });

    expect(result.current.isSourceParametersExpanded).toBeFalsy();

    act(() => {
      result.current.setSourceParametersExpanded(true);
    });

    expect(result.current.isSourceParametersExpanded).toBeTruthy();
  });

  it('should handle onUpdateDocument callback when provided', async () => {
    const mockOnUpdateDocument = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onUpdateDocument={mockOnUpdateDocument}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const docDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'ShipOrder', {});

    const mockDocument = {
      documentType: DocumentType.TARGET_BODY,
      documentId: 'Body',
      definitionType: DocumentDefinitionType.XML_SCHEMA,
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    expect(mockOnUpdateDocument).toHaveBeenCalledWith(docDef);
  });

  it('updateDocument() should not update MappingTree.documentDefinitionType for non-target-body documents', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });
    const originalType = result.current!.mappingTree.documentDefinitionType;

    const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'ShipOrder', {});

    const mockDocument = {
      documentType: DocumentType.SOURCE_BODY,
      documentId: 'Body',
      definitionType: DocumentDefinitionType.XML_SCHEMA,
    } as IDocument;

    act(() => {
      result.current!.updateDocument(mockDocument, docDef, 'test');
    });

    // MappingTree documentDefinitionType should remain unchanged for source documents
    expect(result.current!.mappingTree.documentDefinitionType).toEqual(originalType);
  });

  it('should initialize JSON mappings with DocumentInitializationModel and initialXsltFile', async () => {
    const sourceDocDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'Body', {});
    const targetDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body', {
      ShipOrder: getShipOrderJsonSchema(),
    });
    const parameters = {
      Account: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
        Account: getAccountJsonSchema(),
      }),
      Cart: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Cart', {
        Cart: getCartJsonSchema(),
      }),
      OrderSequence: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'OrderSequence', {}),
    };
    const documentInitializationModel = new DocumentInitializationModel(parameters, sourceDocDef, targetDocDef);

    let latestXslt = '';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider
        documentInitializationModel={documentInitializationModel}
        initialXsltFile={getShipOrderJsonXslt()}
        onUpdateMappings={(xslt) => (latestXslt = xslt)}
      >
        {children}
      </DataMapperProvider>
    );

    const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

    await waitFor(() => {
      expect(result.current!.mappingTree.documentDefinitionType).toEqual(DocumentDefinitionType.JSON_SCHEMA);
      expect(result.current!.targetBodyDocument.definitionType).toEqual(DocumentDefinitionType.JSON_SCHEMA);

      const root = result.current?.mappingTree.children[0];
      expect(root?.children.length).toBe(4);
      const forEachItem = root?.children[3].children[0];
      expect(forEachItem instanceof ForEachItem).toBeTruthy();
      expect((forEachItem as ForEachItem).expression).toBe('$Cart-x/fn:array/fn:map');

      expect(forEachItem?.children[0].children.length).toBe(3);
      const title = forEachItem?.children[0].children[0].children[0] as ValueSelector;
      expect(title.expression).toBe("fn:string[@key='Title']");
      const quantity = forEachItem?.children[0].children[1].children[0] as ValueSelector;
      expect(quantity.expression).toBe("fn:number[@key='Quantity']");
      const price = forEachItem?.children[0].children[2].children[0] as ValueSelector;
      expect(price.expression).toBe("fn:number[@key='Price']");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(latestXslt, 'application/xml');
      const variables = xmlDoc.getElementsByTagName('xsl:variable');
      expect(variables[0].getAttribute('name')).toBe('Account-x');
      expect(variables[1].getAttribute('name')).toBe('Cart-x');
      expect(variables[2].getAttribute('name')).toBe('mapped-xml');
      expect(variables).toHaveLength(3);
    });
  });

  describe('setActiveView()', () => {
    it('should update active view state', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.activeView).toBe(CanvasView.SOURCE_TARGET);

      act(() => {
        result.current.setActiveView(CanvasView.MAPPING_TABLE);
      });

      expect(result.current.activeView).toBe(CanvasView.MAPPING_TABLE);

      act(() => {
        result.current.setActiveView(CanvasView.NAMESPACE_TABLE);
      });

      expect(result.current.activeView).toBe(CanvasView.NAMESPACE_TABLE);
    });
  });

  describe('setDebug()', () => {
    it('should update debug state to true', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.debug).toBe(false);

      act(() => {
        result.current.setDebug(true);
      });

      expect(result.current.debug).toBe(true);
    });

    it('should update debug state to false', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.setDebug(true);
      });

      expect(result.current.debug).toBe(true);

      act(() => {
        result.current.setDebug(false);
      });

      expect(result.current.debug).toBe(false);
    });
  });

  it('should handle multiple alerts correctly', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const alert1: SendAlertProps = { variant: 'info', title: 'Alert 1' };
    const alert2: SendAlertProps = { variant: 'warning', title: 'Alert 2' };
    const alert3: SendAlertProps = { variant: 'danger', title: 'Alert 3' };

    act(() => {
      result.current.sendAlert(alert1);
      result.current.sendAlert(alert2);
      result.current.sendAlert(alert3);
    });

    expect(result.current.alerts).toHaveLength(3);
    expect(result.current.alerts[0]).toEqual(alert1);
    expect(result.current.alerts[1]).toEqual(alert2);
    expect(result.current.alerts[2]).toEqual(alert3);
  });

  it('should return early when old and new names are the same', async () => {
    const mockOnRenameParameter = vi.fn();
    const renameDocSpy = vi.spyOn(DocumentService, 'renameDocument');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onRenameParameter={mockOnRenameParameter}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam', {});
    const mockDocument = {
      documentType: DocumentType.PARAM,
      documentId: 'testParam',
      definitionType: DocumentDefinitionType.Primitive,
      path: { documentId: 'testParam' },
      fields: [] as IField[],
    } as IDocument;

    act(() => {
      result.current.updateDocument(mockDocument, docDef, 'test');
    });

    renameDocSpy.mockClear();
    mockOnRenameParameter.mockClear();

    act(() => {
      result.current.renameSourceParameter('testParam', 'testParam');
    });

    expect(renameDocSpy).not.toHaveBeenCalled();
    expect(mockOnRenameParameter).not.toHaveBeenCalled();
  });

  it('should handle deleting non-existent parameter', async () => {
    const mockOnDeleteParameter = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider onDeleteParameter={mockOnDeleteParameter}>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useDataMapper(), { wrapper });

    expect(result.current.sourceParameterMap.has('nonExistent')).toBeFalsy();

    act(() => {
      result.current.deleteSourceParameter('nonExistent');
    });

    expect(mockOnDeleteParameter).toHaveBeenCalledWith('nonExistent');
    expect(result.current.sourceParameterMap.has('nonExistent')).toBeFalsy();
  });

  describe('updateDocument() document-store path', () => {
    it('should update source body document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const mockDocument = {
        documentType: DocumentType.SOURCE_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
        fields: [] as IField[],
      } as IDocument;

      act(() => {
        result.current.updateDocument(
          mockDocument,
          new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body'),
          '',
        );
      });

      expect(result.current.sourceBodyDocument).toEqual(mockDocument);
    });

    it('should update target body document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const mockDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
        fields: [] as IField[],
      } as IDocument;

      act(() => {
        result.current.updateDocument(
          mockDocument,
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body'),
          '',
        );
      });

      expect(result.current.targetBodyDocument).toEqual(mockDocument);
    });

    it('should reset omitXmlDeclaration when updateDocument is called with a non-XML target document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);

      const mockDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
        fields: [] as IField[],
      } as IDocument;

      act(() => {
        result.current.updateDocument(
          mockDocument,
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.JSON_SCHEMA, 'Body'),
          '',
        );
      });

      expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(false);
    });

    it('should update source parameter in map', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const mockDocument = {
        documentType: DocumentType.PARAM,
        documentId: 'testParam',
        definitionType: DocumentDefinitionType.Primitive,
        fields: [] as IField[],
      } as IDocument;

      act(() => {
        result.current.updateDocument(
          mockDocument,
          new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testParam'),
          '',
        );
      });

      expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();
      expect(result.current.sourceParameterMap.get('testParam')).toEqual(mockDocument);
    });
  });

  describe('stale mapping cleanup on target document replacement', () => {
    /** `updateDocument` prunes through `removeStaleMappings` and then rebuilds the tree through
     * `refreshMappingTree` in the same synchronous pass. These tests pin that the rebuild carries
     * the pruned children forward rather than a pre-prune snapshot. */
    const renderWithOneTargetMapping = async (onUpdateMappings: Mock<(xsltFile: string) => void>) => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={onUpdateMappings}>{children}</DataMapperProvider>
      );
      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const xmlTargetDoc = TestUtil.createTargetOrderDoc();
      act(() => {
        result.current.updateDocument(xmlTargetDoc, xmlTargetDoc.definition, BODY_DOCUMENT_ID);
      });
      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        const fieldItem = new FieldItem(result.current.mappingTree, result.current.targetBodyDocument.fields[0]);
        fieldItem.children.push(new ValueOfSelector(fieldItem));
        result.current.mappingTree.children.push(fieldItem);
        result.current.refreshMappingTree({ structural: true });
      });
      expect(result.current.mappingTree.children).toHaveLength(1);

      return result;
    };

    it('should not restore pruned mappings when the target schema is detached', async () => {
      const onUpdateMappings = vi.fn<(xsltFile: string) => void>();
      const result = await renderWithOneTargetMapping(onUpdateMappings);

      const primitive = DocumentService.createPrimitiveDocument(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        BODY_DOCUMENT_ID,
      );
      onUpdateMappings.mockClear();

      act(() => {
        result.current.updateDocument(primitive.document!, primitive.documentDefinition!, BODY_DOCUMENT_ID);
      });
      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.Primitive);
      });

      expect(result.current.mappingTree.children).toHaveLength(0);
      expect(onUpdateMappings.mock.calls[0][0]).not.toContain('ShipOrder');
    });

    it('should not restore pruned mappings when the target schema is replaced with an incompatible one', async () => {
      const onUpdateMappings = vi.fn<(xsltFile: string) => void>();
      const result = await renderWithOneTargetMapping(onUpdateMappings);

      const jsonTargetDoc = TestUtil.createJSONTargetOrderDoc();
      onUpdateMappings.mockClear();

      act(() => {
        result.current.updateDocument(jsonTargetDoc, jsonTargetDoc.definition, BODY_DOCUMENT_ID);
      });
      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);
      });

      expect(result.current.mappingTree.children).toHaveLength(0);
      expect(onUpdateMappings.mock.calls[0][0]).not.toContain('ShipOrder');
    });

    it('should prune in place and hand back the same MappingTree instance', () => {
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      tree.children.push(new FieldItem(tree, {} as IField));

      const cleaned = MappingService.removeAllMappingsForDocument(tree, DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);

      expect(cleaned).toBe(tree);
      expect(tree.children).toHaveLength(0);
    });
  });

  describe('Initial loading variations', () => {
    it('should initialize with only documentInitializationModel', async () => {
      const sourceDocDef = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        'Body',
        {},
      );
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        {
          ShipOrder: getShipOrderJsonSchema(),
        },
      );
      const documentInitializationModel = new DocumentInitializationModel({}, sourceDocDef, targetDocDef);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={documentInitializationModel}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.targetBodyDocument.definitionType).toEqual(DocumentDefinitionType.JSON_SCHEMA);
        expect(result.current!.sourceBodyDocument.definitionType).toEqual(DocumentDefinitionType.Primitive);
      });
    });

    it('should initialize with only initialXsltFile', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider initialXsltFile={getShipOrderJsonXslt()}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current!.mappingTree).toBeDefined();
      });
    });

    it('should initialize with neither documentInitializationModel nor initialXsltFile', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current!.mappingTree).toBeDefined();
      expect(result.current!.sourceParameterMap).toBeDefined();
      expect(result.current!.targetBodyDocument.definitionType).toEqual(DocumentDefinitionType.Primitive);
    });

    it('should call onUpdateMappings and onUpdateNamespaceMap on mount when there is no initialXsltFile', async () => {
      const mockOnUpdateMappings = vi.fn();
      const mockOnUpdateNamespaceMap = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings} onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.isLoading).toBe(false);
      });

      expect(mockOnUpdateMappings.mock.calls[0][0]).toBe(
        MappingSerializerService.serialize(
          result.current!.mappingTree,
          result.current!.sourceParameterMap,
          result.current!.dataMapperSettings,
        ),
      );
      expect(mockOnUpdateNamespaceMap.mock.calls[0][0]).toEqual({
        fn: 'http://www.w3.org/2005/xpath-functions',
        xs: 'http://www.w3.org/2001/XMLSchema',
        xsl: 'http://www.w3.org/1999/XSL/Transform',
      });
    });

    it('should call onUpdateMappings and onUpdateNamespaceMap on mount when there is an initialXsltFile', async () => {
      const mockOnUpdateMappings = vi.fn();
      const mockOnUpdateNamespaceMap = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider
          initialXsltFile={getShipOrderJsonXslt()}
          onUpdateMappings={mockOnUpdateMappings}
          onUpdateNamespaceMap={mockOnUpdateNamespaceMap}
        >
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.isLoading).toBe(false);
      });

      expect(mockOnUpdateMappings).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateMappings.mock.calls[0][0]).toBe(
        MappingSerializerService.serialize(
          result.current!.mappingTree,
          result.current!.sourceParameterMap,
          result.current!.dataMapperSettings,
        ),
      );
      expect(mockOnUpdateNamespaceMap).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateNamespaceMap.mock.calls[0][0]).toEqual(result.current!.mappingTree.namespaceMap);
    });
  });

  describe('DataMapper Settings', () => {
    it('should initialize with default settings', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.dataMapperSettings).toEqual({
        omitXmlDeclaration: false,
        outputVariable: undefined,
        isOutputValidationEnabled: false,
      });
    });

    it('should update settings with updateDataMapperSettings when target is XML', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // First change target to XML so omitXmlDeclaration can be set
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });
    });

    it('should merge partial settings updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Change target to XML
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      // Update one setting
      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings).toEqual(expect.objectContaining({ omitXmlDeclaration: true }));
      });

      // Update again - demonstrates merge behavior
      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: false });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings).toEqual(expect.objectContaining({ omitXmlDeclaration: false }));
      });
    });

    it('should reset omitXmlDeclaration when target changes from XML to non-XML', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Change target to XML
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      // Set omitXmlDeclaration to true
      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      // Change target to JSON (non-XML)
      const jsonDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        {},
      );

      const mockJsonDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockJsonDocument, jsonDocDef, 'test');
      });

      // Should reset to default (false)
      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(false);
      });
    });

    it('should write the output method matching the target type across attach and detach', async () => {
      const onUpdateMappings = vi.fn();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={onUpdateMappings}>{children}</DataMapperProvider>
      );
      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const switchTarget = async (definitionType: DocumentDefinitionType) => {
        onUpdateMappings.mockClear();
        const docDef = new DocumentDefinition(DocumentType.TARGET_BODY, definitionType, 'Body', {});
        const doc = {
          documentType: DocumentType.TARGET_BODY,
          documentId: 'Body',
          definitionType,
        } as IDocument;
        act(() => {
          result.current.updateDocument(doc, docDef, 'test');
        });
        await waitFor(() => {
          expect(result.current.targetBodyDocument.definitionType).toBe(definitionType);
          expect(onUpdateMappings).toHaveBeenCalled();
        });
        const xslt = onUpdateMappings.mock.calls.at(-1)![0] as string;
        return /<xsl:output[^>]*method="(\w+)"/.exec(xslt)?.[1];
      };

      expect(await switchTarget(DocumentDefinitionType.XML_SCHEMA)).toBe('xml');
      expect(await switchTarget(DocumentDefinitionType.Primitive)).toBe('text');
      expect(await switchTarget(DocumentDefinitionType.JSON_SCHEMA)).toBe('text');
    });

    it('should write xml, then text, then text when an XML schema is attached, detached and a JSON schema attached', async () => {
      const onUpdateMappings = vi.fn<(xsltFile: string) => void>();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={onUpdateMappings}>{children}</DataMapperProvider>
      );
      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const outputMethod = () => /<xsl:output[^>]*method="(\w+)"/.exec(onUpdateMappings.mock.calls.at(-1)![0])?.[1];
      const waitForType = async (definitionType: DocumentDefinitionType) => {
        await waitFor(() => {
          expect(result.current.targetBodyDocument.definitionType).toBe(definitionType);
          expect(onUpdateMappings).toHaveBeenCalled();
        });
      };

      // Attach an XML schema
      const xmlTarget = TestUtil.createTargetOrderDoc();
      onUpdateMappings.mockClear();
      act(() => {
        result.current.updateDocument(xmlTarget, xmlTarget.definition, BODY_DOCUMENT_ID);
      });
      await waitForType(DocumentDefinitionType.XML_SCHEMA);
      expect(outputMethod()).toBe('xml');

      // Detach: the schema is replaced with the primitive document
      const primitive = DocumentService.createPrimitiveDocument(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        BODY_DOCUMENT_ID,
      );
      onUpdateMappings.mockClear();
      act(() => {
        result.current.updateDocument(primitive.document!, primitive.documentDefinition!, BODY_DOCUMENT_ID);
      });
      await waitForType(DocumentDefinitionType.Primitive);
      expect(outputMethod()).toBe('text');

      // Attach a JSON schema
      const jsonTarget = TestUtil.createJSONTargetOrderDoc();
      onUpdateMappings.mockClear();
      act(() => {
        result.current.updateDocument(jsonTarget, jsonTarget.definition, BODY_DOCUMENT_ID);
      });
      await waitForType(DocumentDefinitionType.JSON_SCHEMA);
      expect(outputMethod()).toBe('text');
    });

    it('should serialize the refreshed mapping tree, not the render-stale one, when a target type change also resets settings', async () => {
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={vi.fn()}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      serializeSpy.mockClear();

      const jsonDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        {},
      );
      const mockJsonDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockJsonDocument, jsonDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(false);
      });

      expect(serializeSpy).toHaveBeenCalled();
      expect(serializeSpy.mock.lastCall?.[0].documentDefinitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);

      serializeSpy.mockRestore();
    });

    it('should never emit an XML-shaped payload while switching the target from XML to JSON', async () => {
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');
      const onUpdateMappings = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={onUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      serializeSpy.mockClear();
      onUpdateMappings.mockClear();

      const jsonDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        {},
      );
      const mockJsonDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockJsonDocument, jsonDocDef, 'test');
      });

      // The inline refresh emits once, the settings watcher once more after the sanitized
      // settings commit. Neither may describe the tree as XML once the target is JSON.
      await waitFor(() => {
        expect(onUpdateMappings).toHaveBeenCalledTimes(2);
      });

      const serializedTypes = serializeSpy.mock.calls.map((call) => call[0].documentDefinitionType);
      expect(serializedTypes).not.toContain(DocumentDefinitionType.XML_SCHEMA);

      const serializedOmitFlags = serializeSpy.mock.calls.map((call) => call[2]?.omitXmlDeclaration);
      expect(serializedOmitFlags).not.toContain(true);

      serializeSpy.mockRestore();
    });

    it('should keep the same dataMapperSettings reference when the target change needs no sanitization', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={vi.fn()}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });
      const settingsBefore = result.current.dataMapperSettings;

      const jsonDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        {},
      );
      const mockJsonDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockJsonDocument, jsonDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);
      });

      expect(result.current.dataMapperSettings).toBe(settingsBefore);
    });

    it('should not reset omitXmlDeclaration when target remains XML', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Change target to XML
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      // Set omitXmlDeclaration to true
      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      // Change target to another XML Schema (still XML)
      const xmlDocDef2 = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'Body',
        {},
      );

      const mockXmlDocument2 = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument2, xmlDocDef2, 'test');
      });

      // Should remain true
      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });
    });

    it('should pass dataMapperSettings to serialize in refreshMappingTree', async () => {
      const mockOnUpdateMappings = vi.fn();
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Change target to XML
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      act(() => {
        result.current.refreshMappingTree();
      });

      await waitFor(() => {
        expect(serializeSpy).toHaveBeenCalledWith(
          expect.any(MappingTree),
          expect.any(Map),
          expect.objectContaining({ omitXmlDeclaration: true }),
        );
      });

      serializeSpy.mockRestore();
    });

    it('should set targetDocument on the tree built by refreshMappingTree', async () => {
      const mockOnUpdateMappings = vi.fn();
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Other code paths (e.g. initial mount) may also call serialize, so record the baseline and
      // inspect only the call this test's own refreshMappingTree() triggers.
      const callCountBefore = serializeSpy.mock.calls.length;

      act(() => {
        result.current.refreshMappingTree();
      });

      await waitFor(() => {
        expect(serializeSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
      const [tree] = serializeSpy.mock.calls[serializeSpy.mock.calls.length - 1];
      // A root-level copy-of relies on the tree's targetDocument to classify its schema position
      // (CopyOfPlacementService.getContextField); without it, every root-level copy-of sorts last
      // regardless of what it selects.
      expect((tree as MappingTree).targetDocument).toBe(result.current.targetBodyDocument);

      serializeSpy.mockRestore();
    });

    it('should prefer an explicit targetDocument option over the (possibly stale) state value', async () => {
      const mockOnUpdateMappings = vi.fn();
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Simulates updateDocument's TARGET_BODY case: it calls setTargetBodyDocument(cloned) and then
      // refreshMappingTree(...) synchronously in the same tick, so the closure's targetBodyDocument is
      // still the OLD value — the explicit option is what makes the new document win.
      const overrideDoc = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;
      const callCountBefore = serializeSpy.mock.calls.length;

      act(() => {
        result.current.refreshMappingTree({ targetDocument: overrideDoc });
      });

      await waitFor(() => {
        expect(serializeSpy.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
      const [tree] = serializeSpy.mock.calls[serializeSpy.mock.calls.length - 1];
      expect((tree as MappingTree).targetDocument).toBe(overrideDoc);
      expect((tree as MappingTree).targetDocument).not.toBe(result.current.targetBodyDocument);

      serializeSpy.mockRestore();
    });

    it('should pass dataMapperSettings to serialize in resetMappingTree', async () => {
      const mockOnUpdateMappings = vi.fn();
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      // Change target to XML
      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });

      act(() => {
        result.current.resetMappingTree();
      });

      await waitFor(() => {
        expect(serializeSpy).toHaveBeenCalledWith(
          expect.any(MappingTree),
          expect.any(Map),
          expect.objectContaining({ omitXmlDeclaration: true }),
        );
      });

      serializeSpy.mockRestore();
    });
    it('should restore omitXmlDeclaration from initialXsltFile', async () => {
      const initialXsltFile = `<?xml version="1.0" encoding="UTF-8"?>
<!-- This file is generated by Kaoto DataMapper. Do not edit. -->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes"/>
  <xsl:template match="/"/>
</xsl:stylesheet>`;

      // omit-xml-declaration is only preserved for XML Schema targets — supply a real XSD so
      // DocumentService can create a proper XmlSchemaDocument and the sanitization guard in the
      // provider does not reset the value back to the default.
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'ShipOrder',
        { 'ShipOrder.xsd': getShipOrderXsd() },
      );
      const documentInitializationModel = new DocumentInitializationModel(
        {},
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'Body', {}),
        targetDocDef,
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={documentInitializationModel} initialXsltFile={initialXsltFile}>
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      await waitFor(() => {
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(true);
      });
    });

    it('should reset omitXmlDeclaration on initial load when XSLT has omit-xml-declaration="yes" but target is non-XML', async () => {
      const initialXsltFile = `<?xml version="1.0" encoding="UTF-8"?>
<!-- This file is generated by Kaoto DataMapper. Do not edit. -->
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes" omit-xml-declaration="yes"/>
  <xsl:template match="/"/>
</xsl:stylesheet>`;

      // Non-XML (JSON) target document
      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'Body',
        { ShipOrder: getShipOrderJsonSchema() },
      );
      const documentInitializationModel = new DocumentInitializationModel(
        {},
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'Body', {}),
        targetDocDef,
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={documentInitializationModel} initialXsltFile={initialXsltFile}>
          {children}
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);
        // omitXmlDeclaration must be reset to default even though the XSLT had omit-xml-declaration="yes"
        expect(result.current.dataMapperSettings.omitXmlDeclaration).toBe(false);
      });
    });

    it('should reserialize when dataMapperSettings change', async () => {
      const mockOnUpdateMappings = vi.fn();
      const serializeSpy = vi.spyOn(MappingSerializerService, 'serialize');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const xmlDocDef = new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.XML_SCHEMA, 'Body', {});
      const mockXmlDocument = {
        documentType: DocumentType.TARGET_BODY,
        documentId: 'Body',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockXmlDocument, xmlDocDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.targetBodyDocument.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      });

      serializeSpy.mockClear();
      mockOnUpdateMappings.mockClear();

      act(() => {
        result.current.updateDataMapperSettings({ omitXmlDeclaration: true });
      });

      await waitFor(() => {
        expect(serializeSpy).toHaveBeenCalledWith(
          expect.any(MappingTree),
          expect.any(Map),
          expect.objectContaining({ omitXmlDeclaration: true }),
        );
      });

      expect(mockOnUpdateMappings).toHaveBeenCalled();
      serializeSpy.mockRestore();
    });
  });

  describe('Output Validation', () => {
    it('should default isOutputValidationEnabled to false when prop is not provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.dataMapperSettings.isOutputValidationEnabled).toBe(false);
    });

    it('should reflect isOutputValidationEnabled=true when initialStepSettings is provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider initialStepSettings={{ isOutputValidationEnabled: true }}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.dataMapperSettings.isOutputValidationEnabled).toBe(true);
    });

    it('should call onUpdateStepSettings callback when updateDataMapperSettings is invoked with isOutputValidationEnabled', async () => {
      const mockOnUpdateStepSettings = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateStepSettings={mockOnUpdateStepSettings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.updateDataMapperSettings({ isOutputValidationEnabled: true });
      });

      expect(mockOnUpdateStepSettings).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateStepSettings).toHaveBeenCalledWith(
        expect.objectContaining({ isOutputValidationEnabled: true }),
      );

      act(() => {
        result.current.updateDataMapperSettings({ isOutputValidationEnabled: false });
      });

      expect(mockOnUpdateStepSettings).toHaveBeenCalledTimes(2);
      expect(mockOnUpdateStepSettings).toHaveBeenCalledWith(
        expect.objectContaining({ isOutputValidationEnabled: false }),
      );
    });
  });

  describe('Output Variable', () => {
    it('should default outputVariable to undefined when prop is not provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.dataMapperSettings.outputVariable).toBeUndefined();
    });

    it('should reflect initialOutputVariable when initialStepSettings is provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider initialStepSettings={{ outputVariable: 'myVar' }}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.dataMapperSettings.outputVariable).toBe('myVar');
    });

    it('should call onUpdateStepSettings callback when updateDataMapperSettings is invoked', async () => {
      const mockOnUpdateStepSettings = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateStepSettings={mockOnUpdateStepSettings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.updateDataMapperSettings({ outputVariable: 'myVar' });
      });

      expect(mockOnUpdateStepSettings).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateStepSettings).toHaveBeenCalledWith(expect.objectContaining({ outputVariable: 'myVar' }));

      act(() => {
        result.current.updateDataMapperSettings({ outputVariable: undefined });
      });

      expect(mockOnUpdateStepSettings).toHaveBeenCalledTimes(2);
      expect(mockOnUpdateStepSettings).toHaveBeenCalledWith(expect.objectContaining({ outputVariable: undefined }));
    });
  });

  describe('structuralMappingTree', () => {
    it('should not change structuralMappingTree identity when refreshMappingTree is called without { structural: true }', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const initialStructuralTree = result.current.structuralMappingTree;

      act(() => {
        result.current.refreshMappingTree();
      });
      act(() => {
        result.current.refreshMappingTree();
      });

      expect(result.current.structuralMappingTree).toBe(initialStructuralTree);
    });

    it('should update structuralMappingTree identity when refreshMappingTree is called with { structural: true }', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const initialStructuralTree = result.current.structuralMappingTree;

      act(() => {
        result.current.refreshMappingTree();
      });
      act(() => {
        result.current.refreshMappingTree();
      });
      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.structuralMappingTree).not.toBe(initialStructuralTree);
    });

    it('structuralMappingTree should equal mappingTree after a structural update', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.structuralMappingTree).toBe(result.current.mappingTree);
    });

    it('should call onUpdateMappings on a value-only edit even though structuralMappingTree does not change', () => {
      const mockOnUpdateMappings = vi.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateMappings={mockOnUpdateMappings}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const initialStructuralTree = result.current.structuralMappingTree;
      mockOnUpdateMappings.mockClear();

      act(() => {
        // Simulates a value-only edit (e.g. typing an XPath expression), which does not pass { structural: true }
        result.current.refreshMappingTree();
      });

      expect(mockOnUpdateMappings).toHaveBeenCalledTimes(1);
      expect(result.current.structuralMappingTree).toBe(initialStructuralTree);
    });

    it('should still recompute MappingLinksService.extractMappingLinks() on a value-only edit', () => {
      const extractMappingLinksSpy = vi.spyOn(MappingLinksService, 'extractMappingLinks');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>
          <MappingLinksProvider>{children}</MappingLinksProvider>
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const initialStructuralTree = result.current.structuralMappingTree;
      const callCountAfterMount = extractMappingLinksSpy.mock.calls.length;
      expect(callCountAfterMount).toBeGreaterThan(0);

      act(() => {
        // Simulates a value-only edit (e.g. typing an XPath expression), which does not pass { structural: true }
        result.current.refreshMappingTree();
      });

      expect(result.current.structuralMappingTree).toBe(initialStructuralTree);
      expect(extractMappingLinksSpy).toHaveBeenCalledTimes(callCountAfterMount + 1);

      extractMappingLinksSpy.mockRestore();
    });
  });

  describe('targetRenderIndex', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const createAccountDoc = (schema: string) =>
      TestUtil.createParamOrderDoc('Account', DocumentDefinitionType.JSON_SCHEMA, schema);

    const findJsonField = (parent: IField, key: string): IField => {
      const field = parent.fields.find((child) => child instanceof JsonSchemaField && child.key === key);
      if (!field) throw new Error(`No JSON field keyed '${key}'`);
      return field;
    };

    it('should keep the targetRenderIndex identity when refreshMappingTree is called without { structural: true }', () => {
      const { result } = renderHook(() => useDataMapper(), { wrapper });
      const initialIndex = result.current.targetRenderIndex;

      act(() => {
        result.current.refreshMappingTree();
      });

      expect(result.current.targetRenderIndex).toBe(initialIndex);
    });

    it('should rebuild the targetRenderIndex when refreshMappingTree is called with { structural: true }', () => {
      const { result } = renderHook(() => useDataMapper(), { wrapper });
      const initialIndex = result.current.targetRenderIndex;

      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.targetRenderIndex).not.toBe(initialIndex);
    });

    it('should re-decide an optional guard when its source document is replaced by one that requires the source', () => {
      const { result } = renderHook(() => useDataMapper(), { wrapper });
      const targetDoc = TestUtil.createJSONTargetOrderDoc();
      const accountDoc = createAccountDoc(getAccountJsonSchema());
      act(() => {
        result.current.updateDocument(targetDoc, targetDoc.definition, BODY_DOCUMENT_ID);
      });
      act(() => {
        result.current.updateDocument(accountDoc, accountDoc.definition, accountDoc.documentId);
      });

      const rootField = targetDoc.fields[0];
      const rootItem = MappingService.createFieldItem(result.current.mappingTree, rootField);
      const orderPersonItem = MappingService.createFieldItem(rootItem, findJsonField(rootField, 'OrderPerson'));
      const nameField = findJsonField(accountDoc.fields[0], 'Name');
      MappingService.mapToField(nameField, orderPersonItem);
      const guard = MappingService.tryAutoOptionalIfWrap(orderPersonItem, nameField, false);
      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.targetRenderIndex.isAbsorbed(guard)).toBe(true);

      const requiredAccountDoc = createAccountDoc(getAccountNameRequiredJsonSchema());
      const accountReferenceId = accountDoc.getReferenceId(result.current.mappingTree.namespaceMap);
      act(() => {
        result.current.updateDocument(requiredAccountDoc, requiredAccountDoc.definition, accountReferenceId);
      });

      expect(result.current.mappingTree.children).toContain(rootItem);
      expect(rootItem.children).toContain(guard);
      expect(orderPersonItem.parent).toBe(guard);
      expect(result.current.targetRenderIndex.isAbsorbed(guard)).toBe(false);
    });

    it('should hand the targetRenderIndex to MappingLinksService.extractMappingLinks()', () => {
      const extractMappingLinksSpy = vi.spyOn(MappingLinksService, 'extractMappingLinks');
      const linksWrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>
          <MappingLinksProvider>{children}</MappingLinksProvider>
        </DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper: linksWrapper });
      const initialIndex = result.current.targetRenderIndex;

      expect(extractMappingLinksSpy.mock.lastCall?.[3]).toBe(initialIndex);

      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.targetRenderIndex).not.toBe(initialIndex);
      expect(extractMappingLinksSpy.mock.lastCall?.[3]).toBe(result.current.targetRenderIndex);

      extractMappingLinksSpy.mockRestore();
    });

    it('should build the TargetPanel tree with the targetRenderIndex', () => {
      const createTreeSpy = vi.spyOn(TreeUIService, 'createTree');
      const panelWrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetPanel />
            {children}
          </MappingLinksProvider>
        </DataMapperProvider>
      );
      const getLastTreeRenderIndex = () => {
        const nodeData = createTreeSpy.mock.lastCall?.[0];
        return nodeData instanceof TargetDocumentNodeData ? nodeData.renderIndex : undefined;
      };

      const { result } = renderHook(() => useDataMapper(), { wrapper: panelWrapper });
      const initialIndex = result.current.targetRenderIndex;

      expect(getLastTreeRenderIndex()).toBe(initialIndex);

      act(() => {
        result.current.refreshMappingTree({ structural: true });
      });

      expect(result.current.targetRenderIndex).not.toBe(initialIndex);
      expect(getLastTreeRenderIndex()).toBe(result.current.targetRenderIndex);

      createTreeSpy.mockRestore();
    });
  });
});
