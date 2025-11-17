import { FunctionComponent, useCallback, useContext } from 'react';

import { SourceCode } from '../../components/SourceCode';
import { SourceCodeApiContext, SourceCodeContext } from '../../providers/source-code.provider';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCodeContext = useContext(SourceCodeContext);
  const sourceCodeApiContext = useContext(SourceCodeApiContext);

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      sourceCodeApiContext.setCodeAndNotify(code);
    },
    [sourceCodeApiContext],
  );

  return <SourceCode code={sourceCodeContext ?? ''} onCodeChange={handleCodeChange} />;
};
