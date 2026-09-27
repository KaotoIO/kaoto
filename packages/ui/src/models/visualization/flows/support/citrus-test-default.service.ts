import { cloneDeep } from 'lodash';

import { DefinedComponent } from '../../../camel/camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { ICitrusComponentDefinition, ICitrusTestActionTemplateDefinition } from '../../../citrus/citrus-catalog';
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
   * A complete default value takes precedence and is deep-cloned for each insertion.
   * A value supplied on the selected component takes precedence over its catalog definition.
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A deep-cloned preset or a generated test action structure
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    const definition = definedComponent.definition as ICitrusComponentDefinition | undefined;
    const defaultValue = definedComponent.defaultValue ?? definition?.defaultValue;
    if (defaultValue !== undefined) {
      return cloneDeep(defaultValue) as TestActions;
    }

    if (definedComponent.type === CatalogKind.TestActionTemplate) {
      const template =
        definition?.kind === CatalogKind.TestActionTemplate
          ? (definition as ICitrusTestActionTemplateDefinition)
          : undefined;
      const applyTemplate = {
        name: template?.name ?? definedComponent.name,
        ...(template?.parameters?.length ? { parameters: cloneDeep(template.parameters) } : {}),
      };
      return { applyTemplate };
    }

    const groupSegments = definition?.group ? definition.group.split('-') : [];
    const leafKey = definedComponent.name.split('-').pop()!;

    // Build inside-out: start from the leaf, wrap in each group segment outermost-last
    let result: Record<string, unknown> = { [leafKey]: {} };
    for (const segment of [...groupSegments].reverse()) {
      result = { [segment]: result };
    }

    return result as TestActions;
  }
}
