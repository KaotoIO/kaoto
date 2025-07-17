import { Suggestion, SuggestionProvider } from '@kaoto/forms';
import { IMetadataApi } from '../../../../../../providers';

export const getPropertiesSuggestionProvider = (metadata?: IMetadataApi['getSuggestions']): SuggestionProvider => {
  return {
    id: 'properties-suggestion-provider',
    appliesTo: (_propName, schema) => schema.type === 'string',
    getSuggestions: async (word, context) => {
      const normalizedWord = word !== '' ? word : 'foo';

      const suggestions: Suggestion[] = [
        // https://camel.apache.org/manual/using-propertyplaceholder.html
        {
          value: `{{${normalizedWord}}}`,
          description: `Use '${normalizedWord}' as a property reference`,
          group: word === '' ? 'Property references' : undefined,
        },
        {
          value: `{{${normalizedWord}:default}}`,
          description: `Use '${normalizedWord}' with a default value as a property reference`,
          group: 'Property references',
        },
        {
          value: `{{?${normalizedWord}}}`,
          description: `Use '${normalizedWord}' as an optional property reference`,
          group: 'Property references',
        },
        {
          value: `{{!${normalizedWord}}}`,
          description: `Use '${normalizedWord}' as a negated property reference`,
          group: 'Property references',
        },
        {
          value: `RAW(${normalizedWord})`,
          description: `Use the RAW value of the '${normalizedWord}' property`,
          group: 'Property references',
        },
      ];

      const environmentVariables = (await metadata?.('env', word, context)) ?? [];
      if (environmentVariables.length === 0) {
        suggestions.push({
          value: `{{env:${normalizedWord}}}`,
          description: `Use the '${normalizedWord}' OS environment variable`,
          group: 'Placeholders: Environment variables',
        });
      } else {
        const environmentVariablesSuggestions = environmentVariables.map((item) => ({
          value: `{{env:${item.value}}}`,
          description: `Use the '${item.value}' OS environment variable`,
          group: 'Placeholders: Environment variables',
        }));

        suggestions.push(...environmentVariablesSuggestions);
      }

      // https://camel.apache.org/manual/using-propertyplaceholder.html#_using_property_placeholder_functions
      // Placeholder for Metadata-Topic suggestions
      suggestions.push(
        {
          value: `{{sys:${normalizedWord}}}`,
          description: `Use the '${normalizedWord}' Java JVM system property`,
          group: 'Property functions',
        },
        {
          value: `{{service:${normalizedWord.toUpperCase()}}}`,
          description: `Use the ${normalizedWord.toUpperCase()} service, defined using the service naming idiom. Services are expected to be defined as OS ${normalizedWord.toUpperCase()}_SERVICE_HOST and ${normalizedWord.toUpperCase()}_SERVICE_PORT environment variables.`,
          group: 'Property functions',
        },
        {
          value: `{{service.name:${normalizedWord.toUpperCase()}}}`,
          description: `Use the ${normalizedWord.toUpperCase()} service hostname`,
          group: 'Property functions',
        },
        {
          value: `{{service.port:${normalizedWord.toUpperCase()}}}`,
          description: `Use the ${normalizedWord.toUpperCase()} service port`,
          group: 'Property functions',
        },

        // https://camel.apache.org/manual/using-propertyplaceholder.html#_using_kubernetes_property_placeholder_functions
        {
          value: `{{configmap:${normalizedWord}}}`,
          description: `Use the ${normalizedWord} ConfigMap. It should be in the format 'configmap:configmap-name/configmap-key'`,
          group: 'Kubernetes',
        },
        {
          value: `{{configmap:${normalizedWord}}}:defaultValue`,
          description: `Use the ${normalizedWord} ConfigMap with a default value`,
          group: 'Kubernetes',
        },
        {
          value: `{{configmap-binary:${normalizedWord}}}`,
          description: `Use the binary ${normalizedWord} ConfigMap`,
          group: 'Kubernetes',
        },
        {
          value: `{{secret:${normalizedWord}}}`,
          description: `Use the ${normalizedWord} Secret. It should be in the format 'secret:secret-name/secret-key'`,
          group: 'Kubernetes',
        },
        {
          value: `{{secret-binary:${normalizedWord}}}`,
          description: `Use the binary ${normalizedWord} Secret.`,
          group: 'Kubernetes',
        },
      );

      return suggestions;
    },
  };
};
