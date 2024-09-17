import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';
import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';
import { DefinedComponent } from '../../../camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';

/**
 * CamelComponentDefaultService
 *
 * This class is meant to provide working default values for Camel components.
 */
export class CamelComponentDefaultService {
  /**
   * Get the default definition for the `from` component
   */
  static getDefaultFromDefinitionValue(definedComponent: DefinedComponent): ProcessorDefinition {
    let uri = definedComponent.name;
    if (definedComponent.type === CatalogKind.Kamelet) {
      uri = this.getPrefixedKameletName(definedComponent.name);
    }

    return parse(`
      id: ${getCamelRandomId('from')}
      uri: "${uri}"
      parameters: {}
    `);
  }

  /**
   * Get the default value for a given component and property
   */
  static getDefaultNodeDefinitionValue(definedComponent: DefinedComponent): ProcessorDefinition {
    switch (definedComponent.type) {
      case CatalogKind.Component:
        return this.getDefaultValueFromComponent(definedComponent.name);
      case CatalogKind.Kamelet:
        return this.getDefaultValueFromKamelet(definedComponent.name);
      case CatalogKind.Processor:
        return this.getDefaultValueFromProcessor(definedComponent.name as keyof ProcessorDefinition);
      default:
        return {};
    }
  }

  private static getDefaultValueFromComponent(componentName: string): object {
    switch (componentName) {
      case 'log':
        return parse(`
          to:
            id: ${getCamelRandomId('to')}
            uri: log:InfoLogger
            parameters: {}
        `);

      default:
        return parse(`
          to:
            id: ${getCamelRandomId('to')}
            uri: "${componentName}"
            parameters: {}
        `);
    }
  }

  private static getDefaultValueFromKamelet(kameletName: string): object {
    switch (kameletName) {
      default:
        return parse(`
          to:
            uri: "${this.getPrefixedKameletName(kameletName)}"
            id: ${getCamelRandomId('to')}
        `);
    }
  }

  private static getDefaultValueFromProcessor(processorName: keyof ProcessorDefinition): ProcessorDefinition {
    switch (processorName) {
      case 'choice':
        return parse(`
        choice:
          id: ${getCamelRandomId('choice')}
          when:
          - id: ${getCamelRandomId('when')}
            expression:
              simple:
                expression: "\${header.foo} == 1"
            steps:
            - log:
                id: ${getCamelRandomId('log')}
                message: "\${body}"
          otherwise:
            id: ${getCamelRandomId('otherwise')}
            steps:
            - log:
                id: ${getCamelRandomId('log')}
                message: "\${body}"
        `);

      case 'when':
        return parse(`
        id: ${getCamelRandomId('when')}
        expression:
          simple:
            expression: "\${header.foo} == 1"
        steps:
        - log:
            id: ${getCamelRandomId('log')}
            message: "\${body}"
      `);

      case 'doTry':
        return parse(`
        doTry:
          id: ${getCamelRandomId('doTry')}
          doCatch:
            - id: ${getCamelRandomId('doCatch')}
              exception:
                - java.lang.NullPointerException
              steps: []
          doFinally:
            id: ${getCamelRandomId('doFinally')}
            steps: []
          steps:
            - log:
                id: ${getCamelRandomId('log')}
                message: "\${body}"
        `);

      case 'log':
        return parse(`
        log:
          id: ${getCamelRandomId('log')}
          message: "\${body}"
        `);

      case 'doCatch':
        return parse(`
          id: ${getCamelRandomId('doCatch')}
          exception:
            - java.lang.NullPointerException
          steps: []
        `);

      case 'setHeader':
      case 'setProperty':
      case 'setVariable':
      case 'setBody':
      case 'filter':
        return parse(`
        ${processorName}:
          id: ${getCamelRandomId(processorName)}
          expression:
            simple: {}
        `);

      case 'kaoto-datamapper' as keyof ProcessorDefinition:
        return parse(`
          step:
            id: ${getCamelRandomId('kaoto-datamapper')}
            steps:
              - to:
                  id: ${getCamelRandomId('kaoto-datamapper-xslt')}
                  uri: xslt
                  parameters: {}
          `);

      default:
        return {
          [processorName]: {
            id: getCamelRandomId(processorName),
          },
        };
    }
  }

  private static getPrefixedKameletName(kameletName: string): string {
    return `kamelet:${kameletName}`;
  }
}
