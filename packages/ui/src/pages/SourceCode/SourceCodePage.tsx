import { FunctionComponent, useCallback } from 'react';

import { SourceCode } from '../../components/SourceCode';
import { useSourceCodeStore } from '../../store';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCode = useSourceCodeStore((state) => state.sourceCode);

  const handleCodeChange = useCallback((code: string) => {
    /** Update Entities and Visual Entities */
    useSourceCodeStore.getState().setCodeAndNotify(code);
  }, []);

  return <SourceCode code={sourceCode ?? ''} onCodeChange={handleCodeChange} />;
};
