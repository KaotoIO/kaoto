import { FunctionComponent, useCallback, useContext, useEffect } from 'react';
import { SourceCode } from '../../components/SourceCode';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { EntitiesContext } from '../../providers/entities.provider';

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

  useEffect(() => {
    return entitiesContext?.eventNotifier.subscribe('code:update', (code) => {
      setLocalSourceCode(code);
    });
  }, [entitiesContext?.eventNotifier, setLocalSourceCode]);

  return <SourceCode code={entitiesContext?.code ?? ''} onCodeChange={handleCodeChange} />;
};
