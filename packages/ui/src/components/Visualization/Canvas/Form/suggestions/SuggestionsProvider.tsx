import { useSuggestionRegistry } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { propertiesSuggestionProvider } from './suggestions/properties.suggestions';
import { simpleLanguageSuggestionProvider } from './suggestions/simple-language.suggestions';
import { sqlSyntaxSuggestionProvider } from './suggestions/sql.suggestions';

export const SuggestionRegistrar: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const suggestionRegistryContext = useSuggestionRegistry();

  useEffect(() => {
    suggestionRegistryContext?.registerProvider(propertiesSuggestionProvider);
    suggestionRegistryContext?.registerProvider(simpleLanguageSuggestionProvider);
    suggestionRegistryContext?.registerProvider(sqlSyntaxSuggestionProvider);

    return () => {
      suggestionRegistryContext?.unregisterProvider(propertiesSuggestionProvider.id);
      suggestionRegistryContext?.unregisterProvider(simpleLanguageSuggestionProvider.id);
      suggestionRegistryContext?.unregisterProvider(sqlSyntaxSuggestionProvider.id);
    };
  }, [suggestionRegistryContext]);

  return <>{children}</>;
};
