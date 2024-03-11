import { TextContent } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { EntitiesContext } from '../../providers/entities.provider';
import { RestEditor } from '../../components/RestEditor';

export const RestPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const camelResource = entitiesContext?.camelResource;
  const isSupported = true;

  return isSupported ? <RestEditor /> : <TextContent>Not applicable</TextContent>;
};
