import { FunctionComponent, PropsWithChildren, useEffect } from 'react';

import { LocalStorageKeys } from '../models';
import { EventNotifier } from '../utils';
import { SourceCodeProvider } from './source-code.provider';

export const SourceCodeLocalStorageProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const eventNotifier = EventNotifier.getInstance();

  /**
   * Set the source code, entities, and visual entities from localStorage if available
   * We don't use the useLocalStorage hook because we don't want to re-render the app
   * as we just want to set the initial values
   */
  const localSourceCode = localStorage.getItem(LocalStorageKeys.SourceCode) ?? '[]';

  /**
   * Save the source code into the localStorage
   * We don't use the useLocalStorage hook because we don't want to re-render the app
   * as we just want to store the value
   */
  useEffect(() => {
    const unSubscribeFromEntities = eventNotifier.subscribe('entities:updated', (code) => {
      localStorage.setItem(LocalStorageKeys.SourceCode, code);
    });
    const unSubscribeFromCode = eventNotifier.subscribe('code:updated', ({ code }) => {
      localStorage.setItem(LocalStorageKeys.SourceCode, code);
    });

    return () => {
      unSubscribeFromEntities();
      unSubscribeFromCode();
    };
  }, [eventNotifier]);

  return <SourceCodeProvider initialSourceCode={localSourceCode}>{children}</SourceCodeProvider>;
};
