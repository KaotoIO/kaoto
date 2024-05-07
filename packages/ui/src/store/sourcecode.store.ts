import debounce from 'lodash.debounce';
import { temporal } from 'zundo';
import { StoreApi, create } from 'zustand';

interface SourceCodeState {
  sourceCode: string;
  setSourceCode: (sourceCode: string) => void;
}

export const useSourceCodeStore = create<SourceCodeState>()(
  temporal(
    (set) => ({
      sourceCode: '',
      setSourceCode: (sourceCode: string) => {
        set(() => ({ sourceCode }));
      },
    }),
    {
      // equality: shallow,
      partialize: (state) => ({ sourceCode: state.sourceCode }),
      handleSet: (handleSet) =>
        debounce(
          (
            _pastState: Parameters<StoreApi<SourceCodeState>['setState']>[0],
            _replace: Parameters<StoreApi<SourceCodeState>['setState']>[1],
            currentState: Partial<SourceCodeState>,
            _deltaState?: Partial<Partial<SourceCodeState>> | null,
          ) => {
            console.info('handleSet called', currentState);
            handleSet(currentState);
          },
          1_000,
          {
            leading: false,
            trailing: true,
          },
        ),
    },
  ),
);
