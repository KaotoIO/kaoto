import {
  createContext,
  FunctionComponent,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';

export interface ICanvasContext {
  setFieldReference: (path: string, ref: MutableRefObject<HTMLDivElement>) => void;
  getFieldReference: (path: string) => MutableRefObject<HTMLDivElement>;
  getAllFieldPaths: () => string[];
  reloadFieldReferences: () => void;
  getParentPath: (path: string) => string;
  setParentPath: (path: string, parentPath: string) => void;
  reloadParentPaths: () => void;
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const CanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [fieldReferenceMap, setFieldReferenceMap] = useState<Map<string, MutableRefObject<HTMLDivElement>>>(
    new Map<string, MutableRefObject<HTMLDivElement>>(),
  );
  const [parentPathMap, setParentPathMap] = useState<Map<string, string>>(new Map<string, string>());

  const setFieldReference = useCallback(
    (path: string, ref: MutableRefObject<HTMLDivElement>) => {
      fieldReferenceMap.set(path, ref);
    },
    [fieldReferenceMap],
  );

  const getFieldReference = useCallback(
    (path: string) => {
      return fieldReferenceMap.get(path);
    },
    [fieldReferenceMap],
  );

  const getAllFieldPaths = useCallback(() => {
    return Array.from(fieldReferenceMap.keys());
  }, [fieldReferenceMap]);

  const reloadFieldReferences = useCallback(() => {
    setFieldReferenceMap(new Map(fieldReferenceMap));
  }, [fieldReferenceMap]);

  const getParentPath = useCallback(
    (path: string) => {
      return parentPathMap.get(path);
    },
    [parentPathMap],
  );

  const setParentPath = useCallback(
    (path: string, parentPath: string) => {
      parentPathMap.set(path, parentPath);
    },
    [parentPathMap],
  );

  const reloadParentPaths = useCallback(() => {
    setParentPathMap(new Map(parentPathMap));
  }, [parentPathMap]);

  const value = useMemo(() => {
    return {
      setFieldReference,
      getFieldReference,
      getAllFieldPaths,
      reloadFieldReferences,
      getParentPath,
      setParentPath,
      reloadParentPaths,
    };
  }, [
    setFieldReference,
    getFieldReference,
    getAllFieldPaths,
    reloadFieldReferences,
    getParentPath,
    setParentPath,
    reloadParentPaths,
  ]);

  return <CanvasContext.Provider value={value}>{props.children}</CanvasContext.Provider>;
};
