import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';
import { getCamelRandomId, getHexaDecimalRandomId } from '../../../../camel-utils/camel-random-id';
import { DefinedComponent } from '../../../camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { XSLT_COMPONENT_NAME } from '../../../../utils';
import { CamelComponentFilterService } from './camel-component-filter.service';

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
    if (definedComponent.defaultValue) {
      // If default value is defined, return it
      return this.getNodeDefinitionValue(definedComponent);
    }

    switch (definedComponent.type) {
      case CatalogKind.Component:
        return this.getDefaultValueFromComponent(definedComponent.name);
      case CatalogKind.Kamelet:
        return this.getDefaultValueFromKamelet(definedComponent.name);
      case CatalogKind.Processor:
      case CatalogKind.Entity:
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
      case 'circuitBreaker':
        return parse(`
        circuitBreaker:
          id: ${getCamelRandomId('circuitBreaker')}
          steps: []
          onFallback:
            id: ${getCamelRandomId('onFallback')}
            steps:
            - log:
                id: ${getCamelRandomId('log')}
                message: "\${body}"
        `);

      case 'onFallback' as keyof ProcessorDefinition:
        return parse(`
        id: ${getCamelRandomId('onFallback')}
        steps:
          - log:
              id: ${getCamelRandomId('log')}
              message: "\${body}"
      `);

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

      case 'when' as keyof ProcessorDefinition:
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

      case 'otherwise' as keyof ProcessorDefinition:
      case 'doFinally':
        return parse(`
        id: ${getCamelRandomId(processorName)}
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

      case 'removeHeaders':
        return parse(`
        removeHeaders:
          id: ${getCamelRandomId('removeHeaders')}
          pattern: "*"
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
            id: ${getHexaDecimalRandomId('kaoto-datamapper')}
            steps:
              - to:
                  id: ${getCamelRandomId('kaoto-datamapper-xslt')}
                  uri: ${XSLT_COMPONENT_NAME}
                  parameters: {}
          `);

      case 'delete' as keyof ProcessorDefinition:
      case 'get' as keyof ProcessorDefinition:
      case 'head' as keyof ProcessorDefinition:
      case 'patch' as keyof ProcessorDefinition:
      case 'post' as keyof ProcessorDefinition:
      case 'put' as keyof ProcessorDefinition:
        return { id: getCamelRandomId(processorName) } as ProcessorDefinition;

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

  private static getNodeDefinitionValue(definedComponent: DefinedComponent): ProcessorDefinition {
    const { name, defaultValue } = definedComponent;

    if (CamelComponentFilterService.SPECIAL_PROCESSORS.includes(name)) {
      return defaultValue as ProcessorDefinition;
    } else {
      return { [name]: defaultValue } as ProcessorDefinition;
    }
  }
}
