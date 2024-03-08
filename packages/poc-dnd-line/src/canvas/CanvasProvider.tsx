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

  const value = useMemo(() => {
    return {
      setFieldReference,
      getFieldReference,
      getAllFieldPaths,
      reloadFieldReferences,
    };
  }, [setFieldReference, getFieldReference, getAllFieldPaths, reloadFieldReferences]);

  return <CanvasContext.Provider value={value}>{props.children}</CanvasContext.Provider>;
};
