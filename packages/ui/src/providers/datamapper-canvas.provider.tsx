import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useDataMapper } from '../hooks/useDataMapper';
import { NodeReference } from '../models/datamapper';
import { DocumentType } from '../models/datamapper/document';
import { NodePath } from '../models/datamapper/nodepath';
import { MappingLinksProvider } from './data-mapping-links.provider';
import { DatamapperDndProvider } from './datamapper-dnd.provider';
import { DnDHandler } from './dnd/DnDHandler';

export interface ICanvasContext {
  setNodeReference: (path: string, ref: RefObject<NodeReference>) => void;
  getNodeReference: (path: string) => RefObject<NodeReference> | null;
  reloadNodeReferences: () => void;
  clearNodeReferencesForPath: (path: string) => void;
  clearNodeReferencesForDocument: (documentType: DocumentType, documentId: string) => void;
  getAllNodePaths: () => string[];
  setDefaultHandler: (handler: DnDHandler | undefined) => void;
  getActiveHandler: () => DnDHandler | undefined;
  setActiveHandler: (handler: DnDHandler | undefined) => void;
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const DataMapperCanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { mappingTree } = useDataMapper();
  const [defaultHandler, setDefaultHandler] = useState<DnDHandler | undefined>();
  const [activeHandler, setActiveHandler] = useState<DnDHandler | undefined>();

  const [nodeReferenceMap, setNodeReferenceMap] = useState<Map<string, RefObject<NodeReference>>>(
    new Map<string, RefObject<NodeReference>>(),
  );

  const setNodeReference = useCallback(
    (path: string, ref: RefObject<NodeReference>) => {
      nodeReferenceMap.set(path, ref);
    },
    [nodeReferenceMap],
  );

  const getNodeReference = useCallback(
    (path: string) => {
      return nodeReferenceMap.get(path) || null;
    },
    [nodeReferenceMap],
  );

  const reloadNodeReferences = useCallback(() => {
    setNodeReferenceMap(new Map(nodeReferenceMap));
  }, [nodeReferenceMap]);

  useEffect(() => {
    if (mappingTree) reloadNodeReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingTree]);

  const clearNodeReferencesForPath = useCallback(
    (path: string) => {
      Array.from(nodeReferenceMap.keys())
        .filter((key) => key.startsWith(path))
        .forEach((key) => nodeReferenceMap.delete(key));
    },
    [nodeReferenceMap],
  );

  const clearNodeReferencesForDocument = useCallback(
    (documentType: DocumentType, documentId: string) => {
      const pathPrefix = NodePath.fromDocument(documentType, documentId).toString();
      Array.from(nodeReferenceMap.keys())
        .filter((key) => key.startsWith(pathPrefix))
        .forEach((key) => nodeReferenceMap.delete(key));
    },
    [nodeReferenceMap],
  );

  const getAllNodePaths = useCallback(() => {
    return Array.from(nodeReferenceMap.keys());
  }, [nodeReferenceMap]);

  const handleSetDefaultHandler = useCallback(
    (handler: DnDHandler | undefined) => {
      if (!activeHandler) setActiveHandler(handler);
      setDefaultHandler(handler);
    },
    [activeHandler, setDefaultHandler],
  );

  const handleSetActiveHandler = useCallback(
    (handler: DnDHandler | undefined) => {
      setActiveHandler(handler ? handler : defaultHandler);
    },
    [defaultHandler],
  );

  const value: ICanvasContext = useMemo(() => {
    return {
      setNodeReference,
      getNodeReference,
      reloadNodeReferences,
      clearNodeReferencesForPath,
      clearNodeReferencesForDocument,
      getAllNodePaths,
      setDefaultHandler: handleSetDefaultHandler,
      getActiveHandler: () => activeHandler,
      setActiveHandler: handleSetActiveHandler,
    };
  }, [
    setNodeReference,
    getNodeReference,
    reloadNodeReferences,
    clearNodeReferencesForPath,
    clearNodeReferencesForDocument,
    getAllNodePaths,
    handleSetDefaultHandler,
    handleSetActiveHandler,
    activeHandler,
  ]);

  return (
    <CanvasContext.Provider value={value}>
      <DatamapperDndProvider handler={activeHandler}>
        <MappingLinksProvider>{props.children}</MappingLinksProvider>
      </DatamapperDndProvider>
    </CanvasContext.Provider>
  );
};
