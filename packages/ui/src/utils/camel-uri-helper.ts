import { getParsedValue } from './get-parsed-value';
import { ICamelElementLookupResult } from '../models/visualization/flows/support/camel-component-types';
import { getValue } from './get-value';
import { isDefined } from './is-defined';

export type ParsedParameters = Record<string, string | boolean | number>;

/**
 * Helper class for working with Camel URIs
 */
export class CamelUriHelper {
  private static readonly URI_SEPARATORS_REGEX = /:|(\/\/)|#|\//g;
  private static readonly KNOWN_URI_MAP: Record<string, string> = {
    'http://httpUri': 'http://',
    'https://httpUri': 'https://',
  };

  static getUriString<T>(value: T | undefined | null): string | undefined {
    /** For string-based processor definitions, we can return the definition itself */
    if (typeof value === 'string' && value !== '') {
      return value;
    }

    const uriString = getValue(value, 'uri');

    /** For object-based processor definitions, we can return the `uri` property if not empty */
    if (typeof uriString === 'string' && uriString !== '') {
      return uriString;
    }

    return undefined;
  }

  static getSemanticString<T>(
    camelElementLookup: ICamelElementLookupResult,
    value: T | undefined | null,
  ): string | undefined {
    /** For string-based processor definitions, we return undefined */
    if (!isDefined(value) || typeof value === 'string') {
      return undefined;
    }

    switch (camelElementLookup.componentName) {
      case 'direct':
        return getValue(value, 'parameters.name');
    }

    return undefined;
  }

  private static cleanUriParts(uri: string, syntax: string): string {
    return uri.replace(this.KNOWN_URI_MAP[syntax], '');
  }

  /** Return a new object ignoring the parameters from the `keys` array*/
  private static filterParameters(parameters: ParsedParameters, keys: string[]): ParsedParameters {
    return Object.keys(parameters).reduce((acc, parameterKey) => {
      if (!keys.includes(parameterKey)) {
        acc[parameterKey] = parameters[parameterKey];
      }
      return acc;
    }, {} as ParsedParameters);
  }

  private static createQueryString(parameters: ParsedParameters): string {
    return Object.keys(parameters)
      .map((key) => `${key}=${encodeURIComponent(parameters[key].toString())}`)
      .join('&');
  }
  static getUriStringFromParameters(
    originalUri: string,
    uriSyntax: string,
    parameters?: ParsedParameters,
    options?: { requiredParameters?: string[]; defaultValues?: ParsedParameters },
  ): string {
    const { schema, syntax: syntaxWithoutScheme } = this.getSyntaxWithoutSchema(uriSyntax);
    /** Prepare options */
    const requiredParameters = options?.requiredParameters ?? [];
    const defaultValues = options?.defaultValues ?? {};

    /**
     * Retrieve the delimiters from the syntax by matching the delimiters
     * Example: 'transport:host:port/messageName' => [':', ':', '/']
     */
    const delimiters = syntaxWithoutScheme.match(this.URI_SEPARATORS_REGEX);
    this.URI_SEPARATORS_REGEX.lastIndex = 0;

    /** If the syntax does not contain any delimiters, we can return the URI string as is */
    if (
      syntaxWithoutScheme === '' ||
      (delimiters === null && parameters?.[syntaxWithoutScheme] === undefined) ||
      !isDefined(parameters)
    ) {
      const paramQueryString = this.createQueryString(parameters ?? {});
      return paramQueryString && paramQueryString !== '' ? originalUri + '?' + paramQueryString : originalUri;
    } else if (delimiters === null) {
      const value = parameters?.[syntaxWithoutScheme] ?? defaultValues[syntaxWithoutScheme] ?? '';
      const uri = `${schema}:${this.cleanUriParts(value.toString(), uriSyntax)}`;
      const filteredParameters = this.filterParameters(parameters, [syntaxWithoutScheme]);

      const paramQueryString = this.createQueryString(filteredParameters ?? {});
      return paramQueryString && paramQueryString !== '' ? uri + '?' + paramQueryString : uri;
    }

    /** Otherwise, we create a RegExp using the delimiters found [':', ':', '/'] */
    const delimitersRegex = new RegExp(delimiters.join('|'), 'g');

    /**
     * Splitting the syntax string using the delimiters
     * keys: [ 'transport', 'host', 'port', 'messageName' ]
     */
    const keys = syntaxWithoutScheme.split(delimitersRegex);
    const values = keys.map((key) => {
      const valueOrUndefined = parameters[key] === '' ? undefined : parameters[key];
      const value = valueOrUndefined ?? defaultValues[key] ?? '';
      const isRequired = requiredParameters.includes(key);
      const previousDelimiter = keys.indexOf(key) > 0 ? delimiters[keys.indexOf(key) - 1] : ':';

      return { key, value, isRequired, previousDelimiter };
    });
    values.unshift({ key: 'schema', value: schema, isRequired: true, previousDelimiter: '' });

    const uri = values.reduceRight((acc, current, index) => {
      const isNextSegmentRequired = values[index + 1]?.isRequired;
      if (!current.isRequired && current.value === '' && !isNextSegmentRequired) {
        return acc;
      }

      const cleanValue = this.cleanUriParts(current.value.toString(), uriSyntax);
      return `${current.previousDelimiter}${cleanValue}${acc}`;
    }, '');

    const filteredParameters = this.filterParameters(parameters, keys);

    const paramQueryString = this.createQueryString(filteredParameters ?? {});
    return paramQueryString && paramQueryString !== '' ? uri + '?' + paramQueryString : uri;
  }

  /** Transform the path string portion of a URI `atmosphere-websocket://localhost:8080/echo`, into a key-value object */
  static getParametersFromPathString(
    uriSyntax?: string,
    uriString?: string,
    options?: { requiredParameters?: string[] },
  ): ParsedParameters {
    /** If `:` is not present in the syntax, we can return an empty object since there's nothing to parse */
    if (!uriSyntax || !uriString || !uriSyntax.includes(':')) return {};

    /** Validate that the actual URI contains the correct schema, otherwise return empty object since we could be validating the wrong URI */
    if (!uriString.startsWith(uriSyntax.substring(0, uriSyntax.indexOf(':')))) return {};

    /** Prepare options */
    const requiredParameters = options?.requiredParameters ?? [];
    /** Holder for parsed parameters */
    const parameters: ParsedParameters = {};

    const syntaxWithoutScheme = this.getSyntaxWithoutSchema(uriSyntax).syntax;
    const uriWithoutScheme = this.getUriWithoutScheme(uriString, uriSyntax);

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
        let parsedValue = getParsedValue(values[index]);
        const isLastItem = index === keys.length - 1;
        /** If the values length is greater than the keys length, we need to join the remaining values, f.i. ftp component */
        if (isLastItem && values.length > keys.length) {
          parsedValue = getParsedValue(values.slice(index).join(delimiters[index - 1]));
        }

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

  /**
   * Remove the scheme from the URI syntax:
   * 'avro:transport:host:port/messageName' => { schema: 'avro', syntax: 'transport:host:port/messageName' } */
  private static getSyntaxWithoutSchema(uriSyntax: string): { schema: string; syntax: string } {
    const splitIndex = uriSyntax.indexOf(':');
    const schema = uriSyntax.substring(0, splitIndex === -1 ? uriSyntax.length : splitIndex);
    const syntax = splitIndex === -1 ? '' : uriSyntax.substring(splitIndex + 1);
    return { schema, syntax };
  }

  /** Remove the scheme from the URI string: 'avro:netty:localhost:41414/foo' => 'netty:localhost:41414/foo' */
  private static getUriWithoutScheme(uriString: string, uriSyntax: string): string {
    return uriString.substring(uriSyntax.indexOf(':') + 1);
  }
}
