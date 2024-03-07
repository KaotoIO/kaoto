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
  reloadFieldReference: () => void;
}

export const CanvasContext = createContext<ICanvasContext | undefined>(undefined);

export const CanvasProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [fieldReferenceMap, setFieldReferenceMap] = useState<Map<string, MutableRefObject<HTMLDivElement>>>(
    new Map<string, MutableRefObject<HTMLDivElement>>(),
  );

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

  const reloadFieldReference = useCallback(() => {
    setFieldReferenceMap(new Map(fieldReferenceMap));
  }, [fieldReferenceMap]);

  const value = useMemo(() => {
    return {
      setFieldReference,
      getFieldReference,
      getAllFieldPaths,
      reloadFieldReference,
    };
  }, [setFieldReference, getFieldReference, getAllFieldPaths, reloadFieldReference]);

  return <CanvasContext.Provider value={value}>{props.children}</CanvasContext.Provider>;
};
