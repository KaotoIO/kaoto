import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { SuggestionProvider } from '../../form/models/suggestions';
import { SuggestionRegistryProvider, useSuggestionRegistry } from '../../form/providers';

export const DemoSuggestionProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  return (
    <SuggestionRegistryProvider>
      <SuggestionRegistrar>{children}</SuggestionRegistrar>
    </SuggestionRegistryProvider>
  );
};

const SuggestionRegistrar: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const suggestionRegistryContext = useSuggestionRegistry();

  useEffect(() => {
    suggestionRegistryContext?.registerProvider(demoPropertiesSuggestionProvider);
    suggestionRegistryContext?.registerProvider(demoSimpleLanguageSuggestionProvider);
    suggestionRegistryContext?.registerProvider(demoSqlSyntaxSuggestionProvider);
    return () => {
      suggestionRegistryContext?.unregisterProvider(demoPropertiesSuggestionProvider.id);
      suggestionRegistryContext?.unregisterProvider(demoSimpleLanguageSuggestionProvider.id);
      suggestionRegistryContext?.unregisterProvider(demoSqlSyntaxSuggestionProvider.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};

// Example of static suggestions based on input value
// This provider suggests syntax from: https://camel.apache.org/manual/using-propertyplaceholder.html
const demoPropertiesSuggestionProvider: SuggestionProvider = {
  id: 'demo-properties-suggestion-provider',
  appliesTo: (_propName, schema) => schema.type === 'string',
  getSuggestions: (word, _context) => {
    if (!word) {
      word = 'foo';
    }

    return [
      {
        value: `RAW(${word})`,
        description: `Use '${word}' as raw value`,
      },
      {
        value: `{{${word}}}`,
        description: `Use '${word}' as a property reference`,
      },
      {
        value: `{{${word}:default}}`,
        description: `Use '${word}' with a default value as a property reference`,
      },
      {
        value: `{{?${word}}}`,
        description: `Use '${word}' as an optional property reference`,
        group: 'Property references',
      },
      {
        value: `{{!${word}}}`,
        description: `Use '${word}' as a negated property reference`,
        group: 'Property references',
      },
      {
        value: `{{env:${word}}}`,
        description: `Use '${word}' as an environment variable reference`,
        group: 'Property references',
      },
      {
        value: `{{sys:${word}}}`,
        description: `Use '${word}' as a system variable reference`,
        group: 'Property references',
      },
    ];
  },
};

// Example of a simple language suggestion provider
// This provider suggests syntax from: https://camel.apache.org/components/next/languages/simple-language.html
const demoSimpleLanguageSuggestionProvider: SuggestionProvider = {
  id: 'demo-simple-language-suggestion-provider',
  appliesTo: (_propName, schema) => schema.type === 'string',
  getSuggestions: (word, _context) => {
    // If the word is empty, use `foo` as a placeholder
    if (!word) {
      word = 'foo';
    }

    return [
      {
        value: '${body}',
        description: 'Use the body of the message',
        group: 'Simple Language',
      },
      {
        value: `\${header.${word}}`,
        description: `Use the '${word}' header of the message`,
        group: 'Simple Language',
      },
      {
        value: `\${variable.${word}}`,
        description: `Use the '${word}' variable of the message`,
        group: 'Simple Language',
      },
    ];
  },
};

// Example of SQL syntax suggestion provider
// This provider suggests syntax from: https://camel.apache.org/components/next/languages/sql.html
const demoSqlSyntaxSuggestionProvider: SuggestionProvider = {
  ...demoSimpleLanguageSuggestionProvider,
  id: 'demo-sql-syntax-suggestion-provider',
  getSuggestions: async (word, _context) => {
    const localSuggestions = await demoSimpleLanguageSuggestionProvider.getSuggestions(word, _context);

    return localSuggestions.map((suggestion) => ({
      ...suggestion,
      value: `#${suggestion.value}`,
      description: `SQL: ${suggestion.description}`,
      group: 'SQL Syntax',
    }));
  },
};
