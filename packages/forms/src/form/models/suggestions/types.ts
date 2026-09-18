import { JSONSchema4 } from 'json-schema';

export type Suggestion = {
  /** The value of the suggestion that will be inserted into the input field. */
  value: string;

  /** Additional information about the suggestion, such as a description or tooltip */
  description?: string;

  /** Optional group for the suggestion */
  group?: string;
};

export type GroupedSuggestions = Record<string, Suggestion[]>;

export type SuggestionRequestContext = {
  propertyName: string;
  inputValue: string | number;
  cursorPosition?: number | null;
};

export interface SuggestionProvider {
  /**
   * Unique identifier for the provider.
   */
  id: string;

  /**
   * Determines if this provider should offer suggestions for the given schema.
   * @param propertyName The name of the property for which suggestions are being fetched.
   * @param schema The JSON Schema of the field.
   * @returns True if the provider is applicable, false otherwise.
   */
  appliesTo: (propertyName: string, schema: JSONSchema4) => boolean;

  /**
   * Fetches suggestions based on the current input value and schema.
   * This can be synchronous or asynchronous (returning a Promise).
   * @param propertyName The name of the property for which suggestions are being fetched.
   * @param inputValue The current value in the text input.
   * @returns An array of suggestions.
   */
  getSuggestions: (word: string, context: SuggestionRequestContext) => Suggestion[] | Promise<Suggestion[]>;
}
