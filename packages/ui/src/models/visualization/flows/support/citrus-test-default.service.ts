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
   * A test action template instead produces an `applyTemplate` action using its name
   * and a deep copy of its declared parameters.
   * A non-template action with a supplied default value uses a deep copy of that value.
   *
   * @param definedComponent - The catalog component definition for the test action
   * @returns A cloned default value or a generated test action structure
   */
  static getDefaultTestActionDefinitionValue(definedComponent: DefinedComponent): TestActions {
    const definition = definedComponent.definition as ICitrusComponentDefinition | undefined;
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

    if (definedComponent.defaultValue !== undefined) {
      return cloneDeep(definedComponent.defaultValue) as TestActions;
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
