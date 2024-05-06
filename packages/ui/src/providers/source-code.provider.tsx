import { FunctionComponent, PropsWithChildren, createContext, useCallback, useLayoutEffect, useMemo } from 'react';
import { useSourceCodeStore } from '../store';
import { EventNotifier } from '../utils';

interface ISourceCodeApi {
  /** Set the Source Code and notify subscribers */
  setCodeAndNotify: (sourceCode: string) => void;
}

export const SourceCodeContext = createContext<string>('');
export const SourceCodeApiContext = createContext<ISourceCodeApi>({ setCodeAndNotify: () => {} });

export const SourceCodeProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const eventNotifier = EventNotifier.getInstance();
  const { sourceCode, setSourceCode } = useSourceCodeStore();

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code) => {
      setSourceCode(code);
    });
  }, [eventNotifier, setSourceCode]);

  const setCodeAndNotify = useCallback(
    (code: string) => {
      setSourceCode(code);
      eventNotifier.next('code:updated', code);
    },
    [eventNotifier, setSourceCode],
  );

  const sourceCodeApi: ISourceCodeApi = useMemo(
    () => ({
      setCodeAndNotify,
    }),
    [setCodeAndNotify],
  );

  return (
    <SourceCodeApiContext.Provider value={sourceCodeApi}>
      <SourceCodeContext.Provider value={sourceCode}>{props.children}</SourceCodeContext.Provider>
    </SourceCodeApiContext.Provider>
  );
};
