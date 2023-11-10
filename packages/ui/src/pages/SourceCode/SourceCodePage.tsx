import { FunctionComponent, useCallback, useContext } from 'react';
import { SourceCode } from '../../components/SourceCode';
import { SourceCodeContext } from '../../providers/source-code.provider';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCodeContext = useContext(SourceCodeContext);

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      sourceCodeContext?.setCodeAndNotify(code);
    },
    [sourceCodeContext],
  );

  return <SourceCode code={sourceCodeContext?.sourceCode ?? ''} onCodeChange={handleCodeChange} />;
};
