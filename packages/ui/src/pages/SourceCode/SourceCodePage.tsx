import { FunctionComponent, useCallback } from 'react';

import { SourceCode } from '../../components/SourceCode';
import { useSourceCodeStore } from '../../store';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCode = useSourceCodeStore((state) => state.sourceCode);
  const setCodeAndNotify = useSourceCodeStore((state) => state.setCodeAndNotify);

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      setCodeAndNotify(code);
    },
    [setCodeAndNotify],
  );

  return <SourceCode code={sourceCode} onCodeChange={handleCodeChange} />;
};
