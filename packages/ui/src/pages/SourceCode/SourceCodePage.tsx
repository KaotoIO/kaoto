import { FunctionComponent } from 'react';
import { SourceCode } from '../../components/SourceCode';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';

export const SourceCodePage: FunctionComponent = () => {
  const { setCode, code } = useEntityContext();

  const handleCodeChange = (code: string) => setCode(code);

  return <SourceCode code={code} onCodeChange={handleCodeChange} />;
};
