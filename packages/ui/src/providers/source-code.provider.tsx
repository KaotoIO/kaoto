import {
  FunctionComponent,
  PropsWithChildren,
  createContext,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { EventNotifier } from '../utils';

export const SourceCodeContext = createContext<{
  sourceCode: string;

  /** Set the Source Code and notify subscribers */
  setCodeAndNotify: (sourceCode: string) => void;
} | null>(null);

export const SourceCodeProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const eventNotifier = EventNotifier.getInstance();
  const [sourceCode, setSourceCode] = useState<string>('');

  useLayoutEffect(() => {
    return eventNotifier.subscribe('entities:updated', (code) => {
      setSourceCode(code);
    });
  }, [eventNotifier]);

  const setCodeAndNotify = useCallback(
    (code: string) => {
      setSourceCode(code);
      eventNotifier.next('code:updated', code);
    },
    [eventNotifier],
  );

  const value = useMemo(
    () => ({
      sourceCode,
      setCodeAndNotify,
    }),
    [setCodeAndNotify, sourceCode],
  );

  return <SourceCodeContext.Provider value={value}>{props.children}</SourceCodeContext.Provider>;
};
