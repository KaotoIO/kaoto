import { FunctionComponent, PropsWithChildren } from 'react';

import { DEFAULT_DATAMAPPER_SETTINGS } from '../../models/datamapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { CanvasView } from '../../models/datamapper/view';
import { DataMapperContext, IDataMapperContext } from '../../providers/datamapper.provider';

/**
 * Creates a complete {@link IDataMapperContext} for tests, using the same defaults as `DataMapperProvider`
 * (primitive body documents, empty mapping tree) and `vi.fn()` for every callback.
 * Pass only the members a test cares about.
 */
export const createDataMapperContext = (overrides: Partial<IDataMapperContext> = {}): IDataMapperContext => {
  const mappingTree =
    overrides.mappingTree ??
    new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.Primitive);

  return {
    isLoading: false,
    setIsLoading: vi.fn(),
    activeView: CanvasView.SOURCE_TARGET,
    setActiveView: vi.fn(),
    sourceParameterMap: new Map(),
    refreshSourceParameters: vi.fn(),
    deleteSourceParameter: vi.fn(),
    renameSourceParameter: vi.fn(),
    sourceBodyDocument: new PrimitiveDocument(
      new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    ),
    targetBodyDocument: new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    ),
    updateDocument: vi.fn(),
    isSourceParametersExpanded: true,
    setSourceParametersExpanded: vi.fn(),
    mappingTree,
    structuralMappingTree: mappingTree,
    refreshMappingTree: vi.fn(),
    resetMappingTree: vi.fn(),
    variables: [],
    alerts: [],
    sendAlert: vi.fn(),
    debug: false,
    setDebug: vi.fn(),
    dataMapperSettings: DEFAULT_DATAMAPPER_SETTINGS,
    updateDataMapperSettings: vi.fn(),
    isOutputValidationEnabled: false,
    setOutputValidationEnabled: vi.fn(),
    ...overrides,
  };
};

/**
 * Returns a wrapper component that provides the given context, for `render(..., { wrapper })` and `renderHook`.
 */
export const createDataMapperContextWrapper = (
  context: IDataMapperContext = createDataMapperContext(),
): FunctionComponent<PropsWithChildren> => {
  const DataMapperContextWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperContext.Provider value={context}>{children}</DataMapperContext.Provider>
  );
  return DataMapperContextWrapper;
};
