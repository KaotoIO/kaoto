import { parse } from 'yaml';

import { DefinedComponent } from '../../../camel-catalog-index';
import { TestActions } from '../../../citrus/entities/Test';
import { ICitrusComponentDefinition } from '../../../test-catalog';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

/**
 * TestActionDefaultService
 *
 * This class is meant to provide working default values for Citrus test actions.
 */
export class CitrusTestDefaultService {
  /**
   * Get the default definition for the test action represented by the defined component.
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
