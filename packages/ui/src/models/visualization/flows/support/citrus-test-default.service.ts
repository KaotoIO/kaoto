import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { ICitrusComponentDefinition } from '../../../citrus/citrus-catalog';
import { TestActions } from '../../../citrus/entities/Test';

export class CitrusTestDefaultService {
  /**
   * Gets the default definition for a test action.
   *
   * Creates a default test action structure including any parent action groups.
   * For example, an HTTP send action nested under an 'http' group produces:
   * `{ http: { sendRequest: {} } }`
   *
   * Reads the group ancestry from `definedComponent.definition.group`,
   * splitting the hyphenated group string into nesting levels
   * (e.g. group `camel-jbang` for name `camel-jbang-run` yields
   * `{ camel: { jbang: { run: {} } } }`).
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A TestActions object with the proper nested structure
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    const def = definedComponent.definition as ICitrusComponentDefinition | undefined;
    const groupSegments = def?.group ? def.group.split('-') : [];
    const leafKey = definedComponent.name.split('-').pop()!;

    // Build inside-out: start from the leaf, wrap in each group segment outermost-last
    let result: Record<string, unknown> = { [leafKey]: {} };
    for (const segment of [...groupSegments].reverse()) {
      result = { [segment]: result };
    }

    return result as TestActions;
  }
}
