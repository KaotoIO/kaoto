import { FunctionComponent, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { SourceCode } from '../../components/SourceCode';
import { useLocalStorage } from '../../hooks';
import { LocalStorageKeys } from '../../models';
import { EntitiesContext } from '../../providers';

export const SourceCodePage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const [, setLocalSourceCode] = useLocalStorage(LocalStorageKeys.SourceCode, '');

  /** We use location from react-router-dom to set the base path for the public /camel-catalog folder */
  const location = useLocation();

  const handleCodeChange = useCallback(
    (code: string) => {
      /** Update Entities and Visual Entities */
      entitiesContext?.setCode(code);

      /** Auto save code */
      setLocalSourceCode(code);
    },
    [entitiesContext],
  );

  return (
    <SourceCode schemaBasePath={location.hash} code={entitiesContext?.code ?? ''} onCodeChange={handleCodeChange} />
  );
};
