import { FunctionComponent } from 'react';

import { SourceCode } from '../../components/SourceCode';
import { useSourceCodeStore } from '../../store';

export const SourceCodePage: FunctionComponent = () => {
  const sourceCode = useSourceCodeStore((state) => state.sourceCode);
  const setCodeAndNotify = useSourceCodeStore((state) => state.setCodeAndNotify);

  return <SourceCode code={sourceCode} onCodeChange={setCodeAndNotify} />;
};
