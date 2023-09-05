import { FunctionComponent, useCallback, useContext } from 'react';
import { SourceCode } from '../../components/SourceCode';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { EntitiesContext } from '../../providers';

export const SourceCodePage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const [, setLocalSourceCode] = useLocalStorage(LocalStorageKeys.SourceCode, '');

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      entitiesContext?.setCode(code);

      /** Auto save code */
      setLocalSourceCode(code);
    },
    [entitiesContext],
  );

  return <SourceCode code={entitiesContext?.code ?? ''} onCodeChange={handleCodeChange} />;
};
