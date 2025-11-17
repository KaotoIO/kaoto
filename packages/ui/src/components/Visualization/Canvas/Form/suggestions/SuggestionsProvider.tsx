import { useSuggestionRegistry } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, useContext, useEffect } from 'react';

import { IMetadataApi, MetadataContext } from '../../../../../providers';
import { getPropertiesSuggestionProvider } from './suggestions/properties.suggestions';
import { getSimpleLanguageSuggestionProvider } from './suggestions/simple-language.suggestions';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';

export const SuggestionRegistrar: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const suggestionRegistry = useSuggestionRegistry();
  const getSuggestions = useContext(MetadataContext)?.getSuggestions ?? GET_SUGGESTIONS_NOOP;

  useEffect(() => {
    const simpleLanguageSuggestionProvider = getSimpleLanguageSuggestionProvider(getSuggestions);
    const propertiesSuggestionProvider = getPropertiesSuggestionProvider(getSuggestions);

    suggestionRegistry?.registerProvider(simpleLanguageSuggestionProvider);
    suggestionRegistry?.registerProvider(propertiesSuggestionProvider);
    suggestionRegistry?.registerProvider(sqlSyntaxSuggestionProvider);

    return () => {
      suggestionRegistry?.unregisterProvider(simpleLanguageSuggestionProvider.id);
      suggestionRegistry?.unregisterProvider(propertiesSuggestionProvider.id);
      suggestionRegistry?.unregisterProvider(sqlSyntaxSuggestionProvider.id);
    };
  }, [getSuggestions, suggestionRegistry]);

  return <>{children}</>;
};

const GET_SUGGESTIONS_NOOP: IMetadataApi['getSuggestions'] = async () => {
  return [];
};
