import { parse } from 'yaml';

import { DefinedComponent } from '../../../camel-catalog-index';
import { TestActions } from '../../../citrus/entities/Test';
import { ICitrusComponentDefinition } from '../../../citrus-catalog';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

/**
 * Service for providing default values for Citrus test actions.
 *
 * This service generates working default definitions for test actions based on
 * their catalog definitions. It handles action groups and creates properly
 * structured YAML representations that can be parsed into test action objects.
 */
export class CitrusTestDefaultService {
  /**
   * Gets the default definition for a test action.
   *
   * Creates a default test action structure including any parent action groups.
   * The returned object is a parsed YAML structure with proper nesting for
   * action groups and the action itself.
   *
   * For example, an HTTP send action might be nested under an 'http' group:
   * ```yaml
   * http:
   *   send: {}
   * ```
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A TestActions object with default structure and values
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    let definition: ICitrusComponentDefinition | undefined = definedComponent.definition as ICitrusComponentDefinition;
    if (!definition) {
      definition = CitrusTestSchemaService.getTestActionDefinition(definedComponent.name);
    }

    const groups: ICitrusComponentDefinition[] = CitrusTestSchemaService.getTestActionGroups(definition);

    let yamlCode = '';
    let indent: number = 1;
    groups.forEach((group) => {
      yamlCode += `
      ${' '.repeat(indent * 2)}${group.name.split('-').pop()}:
      `;
      indent++;
    });

    yamlCode += `
      ${' '.repeat(indent * 2)}${definedComponent.name.split('-').pop()}: {}
    `;

    return parse(yamlCode);
  }
}
