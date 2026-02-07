import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { act, useContext, useEffect } from 'react';

import { useDataMapper } from '../hooks/useDataMapper';
import { SendAlertProps } from '../models/datamapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  IField,
} from '../models/datamapper/document';
import { FieldItem, ForEachItem, MappingTree, ValueSelector } from '../models/datamapper/mapping';
import { CanvasView } from '../models/datamapper/view';
import { DocumentService } from '../services/document.service';
import { MappingService } from '../services/mapping.service';
import {
  accountJsonSchema,
  cartJsonSchema,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
} from '../stubs/datamapper/data-mapper';
import { DataMapperContext, DataMapperProvider } from './datamapper.provider';

describe('DataMapperProvider', () => {
  it('should render', async () => {
    render(
      <DataMapperProvider>
        <div data-testid="testdiv" />
      </DataMapperProvider>,
    );
    await screen.findByTestId('testdiv');
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
      return <div data-testid="testdiv"></div>;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree></TestRefreshMappingTree>
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
      return <div data-testid="testdiv"></div>;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree></TestRefreshMappingTree>
      </DataMapperProvider>,
    );
    await waitFor(() => tree);
    expect(tree!.children.length).toEqual(0);
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
      return <div data-testid="testdiv"></div>;
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
    expect(originalMap.get('testParam')).not.toBeDefined();
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
      { ShipOrderJson: shipOrderJsonSchema },
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
    const mockOnUpdateDocument = jest.fn();
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
    const mockOnDeleteParameter = jest.fn();

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
    const mockOnRenameParameter = jest.fn();
    const renameDocSpy = jest.spyOn(DocumentService, 'renameDocument');
    const renameParameterInMappingsSpy = jest.spyOn(MappingService, 'renameParameterInMappings');

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

    expect(renameDocSpy).toHaveBeenCalledWith(mockDocument, 'newTestParam');
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
    const mockOnUpdateDocument = jest.fn();

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
      ShipOrder: shipOrderJsonSchema,
    });
    const parameters = {
      Account: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
        Account: accountJsonSchema,
      }),
      Cart: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Cart', {
        Cart: cartJsonSchema,
      }),
      OrderSequence: new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'OrderSequence', {}),
    };
    const documentInitializationModel = new DocumentInitializationModel(parameters, sourceDocDef, targetDocDef);

    let latestXslt = '';
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider
        documentInitializationModel={documentInitializationModel}
        initialXsltFile={shipOrderJsonXslt}
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
      expect(root?.children.length).toEqual(4);
      const forEachItem = root?.children[3].children[0];
      expect(forEachItem instanceof ForEachItem).toBeTruthy();
      expect((forEachItem as ForEachItem).expression).toEqual('$Cart-x/fn:array/fn:map');

      expect(forEachItem?.children[0].children.length).toEqual(3);
      const title = forEachItem?.children[0].children[0].children[0] as ValueSelector;
      expect(title.expression).toEqual("fn:string[@key='Title']");
      const quantity = forEachItem?.children[0].children[1].children[0] as ValueSelector;
      expect(quantity.expression).toEqual("fn:number[@key='Quantity']");
      const price = forEachItem?.children[0].children[2].children[0] as ValueSelector;
      expect(price.expression).toEqual("fn:number[@key='Price']");

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(latestXslt, 'application/xml');
      const variables = xmlDoc.getElementsByTagName('xsl:variable');
      expect(variables[0].getAttribute('name')).toEqual('Account-x');
      expect(variables[1].getAttribute('name')).toEqual('Cart-x');
      expect(variables[2].getAttribute('name')).toEqual('mapped-xml');
      expect(variables.length).toEqual(3);
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
    const mockOnRenameParameter = jest.fn();
    const renameDocSpy = jest.spyOn(DocumentService, 'renameDocument');

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
    const mockOnDeleteParameter = jest.fn();

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

  describe('setNewDocument()', () => {
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
        result.current.setNewDocument(DocumentType.SOURCE_BODY, 'Body', mockDocument);
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
        result.current.setNewDocument(DocumentType.TARGET_BODY, 'Body', mockDocument);
      });

      expect(result.current.targetBodyDocument).toEqual(mockDocument);
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
        result.current.setNewDocument(DocumentType.PARAM, 'testParam', mockDocument);
      });

      expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();
      expect(result.current.sourceParameterMap.get('testParam')).toEqual(mockDocument);
    });
  });

  describe('XPath functions namespace initialization', () => {
    it('should always have fn namespace initialized for XPath functions', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(result.current.mappingTree.namespaceMap['fn']).toEqual('http://www.w3.org/2005/xpath-functions');
    });

    it('should preserve fn namespace after document updates', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      const docDef = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'Account', {
        Account: accountJsonSchema,
      });

      const mockDocument = {
        documentType: DocumentType.PARAM,
        documentId: 'Account',
        definitionType: DocumentDefinitionType.JSON_SCHEMA,
      } as IDocument;

      act(() => {
        result.current.updateDocument(mockDocument, docDef, 'test');
      });

      await waitFor(() => {
        expect(result.current.mappingTree.namespaceMap['fn']).toEqual('http://www.w3.org/2005/xpath-functions');
      });
    });

    it('should preserve fn namespace after reset', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.resetMappingTree();
      });

      await waitFor(() => {
        expect(result.current.mappingTree.namespaceMap['fn']).toEqual('http://www.w3.org/2005/xpath-functions');
      });
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
          ShipOrder: shipOrderJsonSchema,
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
        <DataMapperProvider initialXsltFile={shipOrderJsonXslt}>{children}</DataMapperProvider>
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
  });

  describe('Namespace synchronization', () => {
    it('should call onUpdateNamespaceMap when refreshMappingTree is called', async () => {
      const mockOnUpdateNamespaceMap = jest.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.refreshMappingTree();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const namespaceMap = mockOnUpdateNamespaceMap.mock.calls[0][0];
      expect(namespaceMap).toBeDefined();
      expect(namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      expect(namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
      expect(namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
    });

    it('should call onUpdateNamespaceMap when resetMappingTree is called', async () => {
      const mockOnUpdateNamespaceMap = jest.fn();

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider onUpdateNamespaceMap={mockOnUpdateNamespaceMap}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      act(() => {
        result.current.resetMappingTree();
      });

      expect(mockOnUpdateNamespaceMap).toHaveBeenCalled();
      const namespaceMap = mockOnUpdateNamespaceMap.mock.calls[0][0];
      expect(namespaceMap).toBeDefined();
      expect(namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
      expect(namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
      expect(namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
    });

    it('should initialize namespace map from DocumentInitializationModel on load', async () => {
      const sourceDocDef = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'Body',
        {},
      );

      const targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        'Body',
        {},
      );

      const documentInitializationModel = new DocumentInitializationModel({}, sourceDocDef, targetDocDef);
      documentInitializationModel.namespaceMap = {
        tns: 'http://example.com/test',
        custom: 'http://example.com/custom',
      };

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider documentInitializationModel={documentInitializationModel}>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });

      await waitFor(() => {
        expect(result.current!.mappingTree.namespaceMap['tns']).toBe('http://example.com/test');
        expect(result.current!.mappingTree.namespaceMap['custom']).toBe('http://example.com/custom');
        expect(result.current!.mappingTree.namespaceMap['fn']).toBe('http://www.w3.org/2005/xpath-functions');
        expect(result.current!.mappingTree.namespaceMap['xs']).toBe('http://www.w3.org/2001/XMLSchema');
        expect(result.current!.mappingTree.namespaceMap['xsl']).toBe('http://www.w3.org/1999/XSL/Transform');
      });
    });

    it('should not call onUpdateNamespaceMap when not provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <DataMapperProvider>{children}</DataMapperProvider>
      );

      const { result } = renderHook(() => useDataMapper(), { wrapper });

      expect(() => {
        act(() => {
          result.current.refreshMappingTree();
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.resetMappingTree();
        });
      }).not.toThrow();
    });
  });
});
