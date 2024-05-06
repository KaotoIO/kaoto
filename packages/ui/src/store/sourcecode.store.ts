import { temporal } from 'zundo';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

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
      equality: shallow,
    },
  ),
);
