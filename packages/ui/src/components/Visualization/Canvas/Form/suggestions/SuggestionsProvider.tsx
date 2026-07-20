import { useSuggestionRegistry } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useEffect } from 'react';

import { IMetadataApi, MetadataContext } from '../../../../../providers';
import { EntitiesContext } from '../../../../../providers/entities.provider';
import { getCustomModeSlugSuggestionProvider } from './suggestions/custom-mode-slug.suggestions';
import { getPropertiesSuggestionProvider } from './suggestions/properties.suggestions';
import { getSimpleLanguageSuggestionProvider } from './suggestions/simple-language.suggestions';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';

export const SuggestionRegistrar: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const suggestionRegistry = useSuggestionRegistry();
  const getSuggestions = useContext(MetadataContext)?.getSuggestions ?? GET_SUGGESTIONS_NOOP;
  const camelResource = useContext(EntitiesContext)?.camelResource;
  const getVisualEntities = useCallback(() => camelResource?.getVisualEntities() ?? [], [camelResource]);

  useEffect(() => {
    const simpleLanguageSuggestionProvider = getSimpleLanguageSuggestionProvider(getSuggestions);
    const propertiesSuggestionProvider = getPropertiesSuggestionProvider(getSuggestions);
    const customModeSlugSuggestionProvider = getCustomModeSlugSuggestionProvider(getVisualEntities);

    suggestionRegistry?.registerProvider(simpleLanguageSuggestionProvider);
    suggestionRegistry?.registerProvider(propertiesSuggestionProvider);
    suggestionRegistry?.registerProvider(sqlSyntaxSuggestionProvider);
    suggestionRegistry?.registerProvider(customModeSlugSuggestionProvider);

    return () => {
      suggestionRegistry?.unregisterProvider(simpleLanguageSuggestionProvider.id);
      suggestionRegistry?.unregisterProvider(propertiesSuggestionProvider.id);
      suggestionRegistry?.unregisterProvider(sqlSyntaxSuggestionProvider.id);
      suggestionRegistry?.unregisterProvider(customModeSlugSuggestionProvider.id);
    };
  }, [getSuggestions, getVisualEntities, suggestionRegistry]);

  return <>{children}</>;
};

const GET_SUGGESTIONS_NOOP: IMetadataApi['getSuggestions'] = async () => {
  return [];
};
