import get from 'lodash.get';
import { getParsedValue } from './get-parsed-value';

type ParsedParameters = Record<string, string | boolean | number>;

/**
 * Helper class for working with Camel URIs
 */
export class CamelUriHelper {
  private static readonly URI_SEPARATORS_REGEX = /:|(\/\/)|\//g;

  static getUriString<T>(value: T | undefined | null): string | undefined {
    /** For string-based processor definitions, we can return the definition itself */
    if (typeof value === 'string' && value !== '') {
      return value;
    }

    const uriString = get(value, 'uri');

    /** For object-based processor definitions, we can return the `uri` property if not empty */
    if (typeof uriString === 'string' && uriString !== '') {
      return uriString;
    }

    return undefined;
  }

  /** Transform the path string portion of a URI `atmosphere-websocket://localhost:8080/echo`, into a key-value object */
  static getParametersFromPathString(
    uriSyntax?: string,
    uriString?: string,
    options?: { requiredParameters?: string[] },
  ): ParsedParameters {
    /** If `:` is not present in the syntax, we can return an empty object since there's nothing to parse */
    if (!uriSyntax || !uriString || !uriSyntax.includes(':')) return {};

    /** Remove the scheme from the URI syntax: 'avro:transport:host:port/messageName' => 'transport:host:port/messageName' */
    const syntaxWithoutScheme = uriSyntax.substring(uriSyntax.indexOf(':') + 1);

    /** Validate that the actual URI contains the correct schema, otherwise return empty object since we could be validating the wrong URI */
    if (!uriString.startsWith(uriSyntax.substring(0, uriSyntax.indexOf(':')))) return {};

    /** Remove the scheme from the URI string: 'avro:netty:localhost:41414/foo' => 'netty:localhost:41414/foo' */
    const uriWithoutScheme = uriString.substring(uriSyntax.indexOf(':') + 1);

    /** Prepare options */
    const requiredParameters = options?.requiredParameters ?? [];
    /** Holder for parsed parameters */
    const parameters: ParsedParameters = {};

    /**
     * Retrieve the delimiters from the syntax by matching the delimiters
     * Example: 'transport:host:port/messageName' => [':', ':', '/']
     */
    const delimiters = syntaxWithoutScheme.match(this.URI_SEPARATORS_REGEX);
    this.URI_SEPARATORS_REGEX.lastIndex = 0;

    /** If the syntax does not contain any delimiters, we can return the URI string as is */
    if (delimiters === null && uriWithoutScheme !== '') {
      parameters[syntaxWithoutScheme] = uriWithoutScheme;
    } else if (delimiters !== null) {
      /** Otherwise, we create a RegExp using the delimiters found [':', ':', '/'] */
      const delimitersRegex = new RegExp(delimiters.join('|'), 'g');

      /**
       * Splitting the syntax and the URI string using the delimiters
       * keys: [ 'transport', 'host', 'port', 'messageName' ]
       * values: [ 'netty', 'localhost', '41414', 'foo' ]
       */
      const keys = syntaxWithoutScheme.split(delimitersRegex);
      const values = uriWithoutScheme.split(delimitersRegex);

      /**
       * There are special cases where some keys are not required, and the user didn't provide them.
       * This is the case for the `jms`, `amqp`, and `activemq` components, where the `destinationType` is not required,
       * so the user can provide the `destinationName` directly.
       * In this situation, if the values length matches the required parameters length,
       * we can remove the non-required key, so we can match the values with the keys.
       */
      if (requiredParameters.length < keys.length && requiredParameters.length === values.length) {
        const nonRequiredKeyIndex = keys.findIndex((key) => !requiredParameters.includes(key));
        if (nonRequiredKeyIndex !== -1) {
          keys.splice(nonRequiredKeyIndex, 1);
        }
      }

      keys.forEach((key, index) => {
        const parsedValue = getParsedValue(values[index]);
        if (key !== '' && parsedValue !== '') {
          parameters[key] = parsedValue;
        }
      });
    }

    return parameters;
  }

  /** Transform the query string portion of a URI `param1=12&param2=hey`, into a key-value object */
  static getParametersFromQueryString(queryString?: string): ParsedParameters {
    return (
      queryString?.split('&').reduce((parameters, parameter) => {
        if (parameter) {
          const [key, stringValue] = parameter.split('=');
          parameters[key] = getParsedValue(stringValue);
        }

        return parameters;
      }, {} as ParsedParameters) ?? {}
    );
  }
}
