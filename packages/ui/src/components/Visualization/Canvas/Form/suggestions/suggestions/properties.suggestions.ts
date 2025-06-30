import { SuggestionProvider } from '@kaoto/forms';

export const propertiesSuggestionProvider: SuggestionProvider = {
  id: 'properties-suggestion-provider',
  appliesTo: (_propName, schema) => schema.type === 'string',
  getSuggestions: async (word, _context) => {
    word ??= 'foo';

    return [
      // https://camel.apache.org/manual/using-propertyplaceholder.html
      {
        value: `RAW(${word})`,
        description: `Use the RAW value of the '${word}' property`,
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

      // https://camel.apache.org/manual/using-propertyplaceholder.html#_using_property_placeholder_functions
      {
        value: `{{env:${word}}}`,
        description: `Use the '${word}' OS environment variable`,
        group: 'Property functions',
      },
      {
        value: `{{sys:${word}}}`,
        description: `Use the '${word}' Java JVM system property`,
        group: 'Property functions',
      },
      {
        value: `{{service:${word.toUpperCase()}}}`,
        description: `Use the ${word.toUpperCase()} service, defined using the service naming idiom. Services are expected to be defined as OS ${word.toUpperCase()}_SERVICE_HOST and ${word.toUpperCase()}_SERVICE_PORT environment variables.`,
        group: 'Property functions',
      },
      {
        value: `{{service.name:${word.toUpperCase()}}}`,
        description: `Use the ${word.toUpperCase()} service hostname`,
        group: 'Property functions',
      },
      {
        value: `{{service.port:${word.toUpperCase()}}}`,
        description: `Use the ${word.toUpperCase()} service port`,
        group: 'Property functions',
      },

      // https://camel.apache.org/manual/using-propertyplaceholder.html#_using_kubernetes_property_placeholder_functions
      {
        value: `{{configmap:${word}}}`,
        description: `Use the ${word} ConfigMap. It should be in the format 'configmap:configmap-name/configmap-key'`,
        group: 'Kubernetes',
      },
      {
        value: `{{configmap:${word}}}:defaultValue`,
        description: `Use the ${word} ConfigMap with a default value`,
        group: 'Kubernetes',
      },
      {
        value: `{{configmap-binary:${word}}}`,
        description: `Use the binary ${word} ConfigMap`,
        group: 'Kubernetes',
      },
      {
        value: `{{secret:${word}}}`,
        description: `Use the ${word} Secret. It should be in the format 'secret:secret-name/secret-key'`,
        group: 'Kubernetes',
      },
      {
        value: `{{secret-binary:${word}}}`,
        description: `Use the binary ${word} Secret.`,
        group: 'Kubernetes',
      },
    ];
  },
};
