import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

interface SourceCodeState {
  sourceCode: string;
  setSourceCode: (sourceCode: string) => void;
}

export const useSourceCodeStore = createWithEqualityFn<SourceCodeState>(
  (set) => ({
    sourceCode: '',
    setSourceCode: (sourceCode: string) => {
      set(() => ({ sourceCode }));
    },
  }),
  shallow,
);
