import { parse } from 'yaml';

import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { ICitrusComponentDefinition } from '../../../citrus/citrus-catalog';
import { TestActions } from '../../../citrus/entities/Test';

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
   * Reads the group ancestry from `definedComponent.name` / `definedComponent.definition`,
   * splitting the hyphenated group prefixes (e.g. `camel-jbang-run` under group `camel-jbang`
   * yields segments `camel` -> `jbang` -> `run`).
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A TestActions object with default structure and values
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    const def = definedComponent.definition as ICitrusComponentDefinition | undefined;
    const groupSegments = def?.group ? def.group.split('-') : [];

    let yamlCode = '';
    let indent = 1;
    for (const segment of groupSegments) {
      yamlCode += `\n${' '.repeat(indent * 2)}${segment}:`;
      indent++;
    }
    yamlCode += `\n${' '.repeat(indent * 2)}${definedComponent.name.split('-').pop()}: {}`;

    return parse(yamlCode);
  }
}
