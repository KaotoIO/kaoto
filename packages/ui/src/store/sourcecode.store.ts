import type {} from '@redux-devtools/extension'; // required for devtools typing
import { isEqual } from 'lodash';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { EventNotifier } from '../utils/event-notifier';

interface SourceCodeState {
  sourceCode: string;
  path?: string;
  setSourceCode: (sourceCode: string) => void;
  setPath: (path?: string) => void;
  setCodeAndNotify: (sourceCode: string, path?: string) => void;
}

export const useSourceCodeStore = create<SourceCodeState>()(
  devtools(
    temporal(
      (set) => ({
        sourceCode: '',
        path: '',
        setSourceCode: (sourceCode: string) => {
          set(() => ({ sourceCode }));
        },
        setPath: (path?: string) => {
          set(() => ({ path }));
        },
        setCodeAndNotify: (sourceCode: string, path?: string) => {
          set(() => ({ sourceCode, path }));
          EventNotifier.getInstance().next('code:updated', { code: sourceCode, path });
        },
      }),
      {
        wrapTemporal: (storeInitializer) =>
          devtools(storeInitializer, {
            name: 'Undo/Redo store',
          }),
        equality: isEqual,
        partialize: (state) => ({
          sourceCode: state.sourceCode,
        }),
      },
    ),
    { name: 'Source code store' },
  ),
);
