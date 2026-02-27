import { isDefined } from '@kaoto/forms';

import { CatalogKind } from '../../../catalog-kind';
import { TestAction, TestActions } from '../../../citrus/entities/Test';
import { ICitrusComponentDefinition } from '../../../citrus-catalog';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { CamelCatalogService } from '../camel-catalog.service';

/**
 * Service for managing Citrus test action schemas and metadata.
 *
 * Provides utilities for:
 * - Retrieving JSON schemas for test actions
 * - Resolving test action names and definitions
 * - Managing test action groups and hierarchies
 * - Determining container settings for nested actions
 * - Extracting metadata like titles and descriptions
 */
export class CitrusTestSchemaService {
  /**
   * Gets the JSON schema for a test action node.
   *
   * @param name - The name of the test action
   * @param action - The test action instance (optional)
   * @returns The JSON schema for the action's properties, or undefined if not found
   */
  static getNodeSchema(name: string, action?: TestAction): KaotoSchemaDefinition['schema'] | undefined {
    if (action === undefined) {
      return undefined;
    }

    const definition = this.getTestActionDefinition(name);
    return definition?.propertiesSchema || ({} as KaotoSchemaDefinition['schema']);
  }

  /**
   * Gets the display title for a test action node.
   *
   * @param name - The name of the test action
   * @returns The title from the catalog definition, or the name if not found
   */
  static getNodeTitle(name: string): string {
    return this.getTestActionDefinition(name)?.title ?? name;
  }

  /**
   * Gets the tooltip content for a test action node.
   *
   * Prefers the description from the action instance if available,
   * otherwise falls back to the catalog definition.
   *
   * @param name - The name of the test action
   * @param action - The test action instance
   * @returns The description text for the tooltip
   */
  static getTooltipContent(name: string, action: TestAction): string {
    const description = action?.description;
    if (description) {
      return description;
    }

    return this.getTestActionDefinition(name)?.description ?? name;
  }

  /**
   * Extracts the test action name from a test action object.
   *
   * Searches through the action's properties to find a matching catalog definition.
   * Handles both regular actions and action groups with nested structures.
   *
   * @param action - The test action object to analyze
   * @returns The name of the test action, or 'custom' if not recognized
   */
  static getTestActionName(action: TestActions): string {
    if (action === undefined) {
      return 'unknown';
    }

    const jsonRecord = action as Record<string, unknown>;
    let name = 'custom';
    for (const key in jsonRecord) {
      if (jsonRecord[key] !== undefined) {
        const definition = this.getTestActionDefinition(key);
        if (!definition) {
          // not a known test action, continue searching for a better fit
          name = key;
          continue;
        }

        if (definition.kind === CatalogKind.TestActionGroup) {
          return this.resolveTestActionName(jsonRecord[key] as TestAction, definition);
        }

        return key;
      }
    }

    return name;
  }

  /**
   * Gets the catalog definition for a test action.
   *
   * Searches through test actions, containers, and action groups in the catalog.
   * Resolves action group hierarchies by merging properties from parent groups.
   *
   * @param actionName - The name of the test action
   * @returns The component definition with resolved properties, or undefined if not found
   */
  static getTestActionDefinition(actionName: string): ICitrusComponentDefinition | undefined {
    let actionDef: ICitrusComponentDefinition | undefined =
      CamelCatalogService.getComponent(CatalogKind.TestAction, actionName) ??
      CamelCatalogService.getComponent(CatalogKind.TestContainer, actionName);

    if (!isDefined(actionDef)) {
      actionDef = CamelCatalogService.getComponent(CatalogKind.TestActionGroup, actionName);
    }

    if (!isDefined(actionDef)) {
      return undefined;
    }

    // Clone to avoid mutating the shared catalog entry
    actionDef = {
      ...actionDef,
      propertiesSchema: actionDef.propertiesSchema ? { ...actionDef.propertiesSchema } : undefined,
    };

    if (actionDef.group !== undefined) {
      this.resolveTestActionGroup(actionDef.group, actionDef);
    }

    return actionDef;
  }

  /**
   * Gets the hierarchy of action groups for a test action.
   *
   * Recursively resolves parent groups to build the complete group hierarchy
   * from root to the immediate parent.
   *
   * @param actionDef - The action definition to get groups for
   * @returns Array of group definitions ordered from root to immediate parent
   */
  static getTestActionGroups(actionDef?: ICitrusComponentDefinition): ICitrusComponentDefinition[] {
    if (!actionDef) {
      return [];
    }

    if (actionDef.group !== undefined) {
      const groupDef = this.getTestActionDefinition(actionDef.group);
      if (groupDef) {
        return [...this.getTestActionGroups(groupDef), groupDef];
      }
    }

    return [];
  }

  /**
   * Gets the container settings for a test action path.
   *
   * Determines how nested actions should be handled based on the container type.
   * Different containers have different nesting behaviors:
   * - 'branch': Sequential list of actions (e.g., iterate, sequential)
   * - 'array-node': Parallel array of actions (e.g., parallel)
   * - 'single-node': Single nested action (e.g., soap-assertFault)
   *
   * @param path - The path to the test action in the visualization tree
   * @returns Container settings if the action is a container, undefined otherwise
   */
  static getTestContainerSettings(path?: string): CitrusTestContainerSettings | undefined {
    if (!path) {
      return undefined;
    }

    const pathArray = path.split('.');
    const last = pathArray[pathArray.length - 1];
    const penultimate = pathArray[pathArray.length - 2];

    const parentNode = Number.isInteger(Number(last)) ? penultimate : last;
    switch (parentNode) {
      case 'iterate':
      case 'repeat':
      case 'repeatOnError':
      case 'sequential':
      case 'conditional':
      case 'doFinally':
      case 'waitFor':
      case 'async':
        return { name: 'actions', type: 'branch' };

      case 'parallel':
        return { name: 'actions', type: 'array-node' };

      case 'catch':
      case 'assert':
        return { name: 'when', type: 'branch' };

      case 'soap-assertFault':
        return { name: 'when', type: 'single-node' };

      case 'agent-run':
        return { name: 'actions', type: 'branch' };

      default:
        return undefined;
    }
  }

  private static resolveTestActionGroup(
    group: string,
    actionDef: ICitrusComponentDefinition,
  ): ICitrusComponentDefinition {
    // get test action group component from test action catalog, because all test action groups are included in this catalog
    let groupDef: ICitrusComponentDefinition | undefined = CamelCatalogService.getComponent(
      CatalogKind.TestAction,
      group,
    );

    if (!isDefined(groupDef)) {
      return actionDef;
    }

    // Clone to avoid mutating the shared catalog entry
    groupDef = {
      ...groupDef,
      propertiesSchema: groupDef.propertiesSchema ? { ...groupDef.propertiesSchema } : undefined,
    };

    if (groupDef.group !== undefined) {
      groupDef = this.resolveTestActionGroup(groupDef.group, groupDef);
    }

    if (actionDef.propertiesSchema) {
      const schemaProperties = {
        ...(actionDef.propertiesSchema?.properties ?? ({} as Record<string, KaotoSchemaDefinition['schema']>)),
      };
      for (const propertiesKey in groupDef.propertiesSchema?.properties) {
        schemaProperties[propertiesKey] = groupDef.propertiesSchema?.properties[propertiesKey];
      }
      actionDef.propertiesSchema.properties = schemaProperties;
    } else {
      actionDef.propertiesSchema = groupDef.propertiesSchema;
    }

    return actionDef;
  }

  /**
   * Extracts the test action name from a path string.
   *
   * @param path - The path string (e.g., 'actions.0.echo')
   * @returns The last segment of the path (e.g., 'echo')
   */
  static extractTestActionName(path: string) {
    return path.split('.').pop() ?? '';
  }

  /**
   * Resolves the full test action name including group prefixes.
   *
   * Recursively searches through action groups to build the complete
   * action name with group hierarchy
   * (e.g., 'http-send' where 'http' represents the test action group).
   *
   * @param action - The test action object
   * @param groupDef - The parent group definition
   * @returns The fully qualified action name with group prefixes
   */
  private static resolveTestActionName(action: TestAction, groupDef: ICitrusComponentDefinition): string {
    const jsonRecord = action as Record<string, unknown>;
    for (const key in jsonRecord) {
      if (jsonRecord[key] !== undefined) {
        const definition = this.getTestActionDefinition(`${groupDef.name}-${key}`);
        if (!definition) {
          // not a known test action, continue searching for a better fit
          continue;
        }

        if (definition.kind == CatalogKind.TestActionGroup) {
          return this.resolveTestActionName(jsonRecord[key] as TestAction, definition);
        }

        return `${groupDef.name}-${key}`;
      }
    }

    return groupDef.name;
  }
}

/**
 * Interface to shape the properties from test action containers that can be filled
 * with nested test actions.
 */
export interface CitrusTestContainerSettings {
  /** Property name in the container that holds the nested test actions, f.i., `actions`, `when` */
  name: string;

  /**
   * Property handling type
   * single-node: the property can have a single nested action, f.i. `catchException` and `assertException`
   * branch: the container has a list of nested actions and represent a logical path in the test, f.i. `conditional`
   * array-node: the property is an array of nested test actions, f.i. `iterate` and `sequential`
   */
  type: 'single-node' | 'branch' | 'array-node';
}
