import { parse } from 'yaml';

import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { ICitrusComponentDefinition } from '../../../citrus/citrus-catalog';
import { TestActions } from '../../../citrus/entities/Test';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

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
   * Reads the group ancestry from `definedComponent.definition`, which is
   * already populated by the async catalog call in the hook before `addStep`
   * is invoked. Falls back gracefully when `definition` is absent.
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A TestActions object with default structure and values
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    const def = definedComponent.definition as ICitrusComponentDefinition | undefined;
    const groups = CitrusTestDefaultService.resolveGroupChain(def);

    let yamlCode = '';
    let indent = 1;
    for (const group of groups) {
      yamlCode += `\n${' '.repeat(indent * 2)}${group.name.split('-').pop()}:`;
      indent++;
    }
    yamlCode += `\n${' '.repeat(indent * 2)}${definedComponent.name.split('-').pop()}: {}`;

    return parse(yamlCode);
  }

  /**
   * Walks the group ancestry chain of a Citrus component definition,
   * returning groups ordered from root to immediate parent.
   *
   * Uses `def.group` to identify the immediate parent group name and then
   * delegates to `CitrusTestSchemaService.getTestActionDefinition` to obtain
   * the full ancestor list. Returns an empty array when `def` is absent or
   * has no group.
   */
  private static resolveGroupChain(def: ICitrusComponentDefinition | undefined): ICitrusComponentDefinition[] {
    if (!def?.group) return [];
    const result = CitrusTestSchemaService.getTestActionDefinition(def.group);
    if (!result) return [];
    return [...result.groups, result.definition];
  }
}
