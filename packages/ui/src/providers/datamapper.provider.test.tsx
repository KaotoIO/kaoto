import { DataMapperContext, DataMapperProvider } from './datamapper.provider';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { useDataMapper } from '../hooks/useDataMapper';
import { FieldItem, ForEachItem, MappingTree } from '../models/datamapper/mapping';
import { act, useContext, useEffect } from 'react';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  IField,
} from '../models/datamapper/document';
import {
  accountJsonSchema,
  cartJsonSchema,
  shipOrderJsonSchema,
  shipOrderJsonXslt,
} from '../stubs/datamapper/data-mapper';

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
      result.current!.updateDocument(mockDocument, docDef);
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
      result.current.updateDocument(mockDocument, docDef);
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
      result.current.updateDocument(mockDocument, docDef);
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();
    expect(result.current.sourceParameterMap.get('testParam')).toEqual(mockDocument);
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
      result.current.updateDocument(mockDocument, docDef);
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeTruthy();

    // Then delete it
    act(() => {
      result.current.deleteSourceParameter('testParam');
    });

    expect(result.current.sourceParameterMap.has('testParam')).toBeFalsy();
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
      result.current.updateDocument(mockDocument, docDef);
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
      result.current!.updateDocument(mockDocument, docDef);
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider documentInitializationModel={documentInitializationModel} initialXsltFile={shipOrderJsonXslt}>
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
      expect((forEachItem as ForEachItem).expression).toEqual('$Cart-x/xf:array/xf:map');
    });
  });
});
