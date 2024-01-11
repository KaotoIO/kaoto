import get from 'lodash.get';
import { getParsedValue } from './get-parsed-value';

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

  /** Given a URI Syntax and a URI string, return the parametrized version of it */
  static uriSyntaxToParameters(uriSyntax: string, uriString: string): Record<string, string | boolean | number> {
    /** If `:` is not present in the syntax, we can return an empty object */
    if (!uriSyntax.includes(':')) return {};

    /** Holder for parsed parameters */
    const parameters: Record<string, string | boolean | number> = {};

    /** Remove the scheme from the URI syntax: 'avro:transport:host:port/messageName' => 'transport:host:port/messageName' */
    const syntaxWithoutScheme = uriSyntax.substring(uriSyntax.indexOf(':') + 1);
    /** Remove the scheme from the URI string: 'avro:netty:localhost:41414/foo' => 'netty:localhost:41414/foo' */
    const uriWithoutScheme = uriString.substring(uriString.indexOf(':') + 1);

    /** Split the string into path parameters and query parameters: pathParameters?queryParameters */
    const stringParts = uriWithoutScheme.split('?');
    const pathParametersString = stringParts[0];
    const queryParametersString = stringParts[1];

    /** Process query parameters */
    if (queryParametersString !== undefined) {
      const queryParameters = queryParametersString.split('&');

      queryParameters.forEach((parameter) => {
        const [key, stringValue] = parameter.split('=');
        parameters[key] = getParsedValue(stringValue);
      });
    }

    /**
     * Retrieve the delimiters from the syntax by matching the delimiters
     * Example: 'transport:host:port/messageName' => [':', ':', '/']
     */
    const delimiters = syntaxWithoutScheme.match(this.URI_SEPARATORS_REGEX);
    this.URI_SEPARATORS_REGEX.lastIndex = 0;

    /** If the syntax does not contain any delimiters, we can return the URI string as is */
    if (delimiters === null) {
      parameters[syntaxWithoutScheme] = pathParametersString;
    } else {
      /** Otherwise, we can split the path parameters string by the delimiters */
      const delimitersRegex = new RegExp(delimiters.join('|'), 'g');
      const keys = syntaxWithoutScheme.split(delimitersRegex);
      const values = pathParametersString.split(delimitersRegex);

      keys.forEach((key, index) => {
        if (key !== '') {
          parameters[key] = getParsedValue(values[index]);
        }
      });
    }

    return parameters;
  }
}
