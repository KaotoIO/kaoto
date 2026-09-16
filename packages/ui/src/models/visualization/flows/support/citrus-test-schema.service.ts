import { isDefined } from '@kaoto/forms';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../catalog-kind';
import { ICitrusComponentDefinition } from '../../../citrus/citrus-catalog';
import { TestAction, TestActions } from '../../../citrus/entities/Test';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';

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
  /** Lazy kind-only map populated on first getTestActionName call. Null = not yet built. */
  private static kindMap: Record<string, CatalogKind> | null = null;
  /** Incremented on every clearKindMap() call; used to discard in-flight builds. */
  private static kindMapGeneration = 0;

  private static async ensureKindMap(): Promise<void> {
    if (CitrusTestSchemaService.kindMap !== null) return;

    const generation = CitrusTestSchemaService.kindMapGeneration;
    const registry = DynamicCatalogRegistry.get();
    const kindMap: Record<string, CatalogKind> = {};

    const actions = (await registry.getCatalog(CatalogKind.TestAction)?.getAll()) ?? {};
    for (const [key, val] of Object.entries(actions)) {
      kindMap[key] = (val as ICitrusComponentDefinition).kind;
    }

    const containers = (await registry.getCatalog(CatalogKind.TestContainer)?.getAll()) ?? {};
    for (const [key, val] of Object.entries(containers)) {
      kindMap[key] ??= (val as ICitrusComponentDefinition).kind;
    }

    // Discard the result if clearKindMap() was called while we were building it.
    if (generation === CitrusTestSchemaService.kindMapGeneration) {
      CitrusTestSchemaService.kindMap = kindMap;
    }
  }

  /**
   * Clears the cached kind map, forcing a rebuild on the next call to getTestActionName.
   * Must be called in CatalogLoaderProvider's cleanup alongside clearRegistry().
   */
  static clearKindMap(): void {
    CitrusTestSchemaService.kindMapGeneration++;
    CitrusTestSchemaService.kindMap = null;
  }

  /**
   * Extracts the test action name from a test action object.
   *
   * Awaits ensureKindMap() once (only on cold start or after clearKindMap()), then
   * all subsequent lookups within the call are synchronous O(1) map reads.
   *
   * @param action - The test action object to analyze
   * @returns The name of the test action, or 'custom' if not recognized
   */
  static async getTestActionName(action: TestActions): Promise<string> {
    if (action === undefined) return 'unknown';

    await CitrusTestSchemaService.ensureKindMap();

    const jsonRecord = action as Record<string, unknown>;
    let name = 'custom';

    for (const key in jsonRecord) {
      if (jsonRecord[key] === undefined) continue;

      const kind = CitrusTestSchemaService.kindMap![key];
      if (kind === undefined) {
        name = key;
        continue;
      }
      if (kind === CatalogKind.TestActionGroup) {
        return CitrusTestSchemaService.resolveTestActionName(jsonRecord[key] as TestAction, key);
      }
      return key;
    }

    return name;
  }

  /**
   * Gets the catalog definition and ordered group chain for a test action.
   *
   * Searches through test actions and containers in the dynamic catalog registry.
   * Resolves the group hierarchy by merging properties from parent groups into
   * the returned definition, and collects the ancestor groups ordered from
   * root to immediate parent.
   *
   * @param actionName - The name of the test action
   * @returns Object with the resolved definition and groups array, or undefined if not found
   */
  static async getTestActionDefinition(
    actionName: string,
  ): Promise<{ definition: ICitrusComponentDefinition; groups: ICitrusComponentDefinition[] } | undefined> {
    const registry = DynamicCatalogRegistry.get();
    let actionDef: ICitrusComponentDefinition | undefined =
      (await registry.getEntity(CatalogKind.TestAction, actionName)) ??
      (await registry.getEntity(CatalogKind.TestContainer, actionName));

    if (!isDefined(actionDef)) return undefined;

    // Clone to avoid mutating the shared catalog entry
    actionDef = cloneDeep(actionDef);

    if (actionDef.group === undefined) {
      return { definition: actionDef, groups: [] };
    }

    const parentResult = await this.getTestActionDefinition(actionDef.group);
    if (!isDefined(parentResult)) {
      return { definition: actionDef, groups: [] };
    }

    this.resolveTestActionGroup(parentResult.definition, actionDef);

    return {
      definition: actionDef,
      groups: [...parentResult.groups, parentResult.definition],
    };
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
    groupDef: ICitrusComponentDefinition,
    actionDef: ICitrusComponentDefinition,
  ): void {
    // groupDef is already resolved by getTestActionDefinition (which handles all CatalogKinds,
    // recursion, and cloning) — no CamelCatalogService lookup needed here.

    if (actionDef.propertiesSchema) {
      const schemaProperties = {
        ...(actionDef.propertiesSchema.properties ?? ({} as Record<string, KaotoSchemaDefinition['schema']>)),
      };
      for (const propertiesKey in groupDef.propertiesSchema?.properties) {
        schemaProperties[propertiesKey] = groupDef.propertiesSchema.properties[propertiesKey];
      }
      actionDef.propertiesSchema.properties = schemaProperties;
    } else {
      actionDef.propertiesSchema = groupDef.propertiesSchema;
    }
  }

  /**
   * Resolves the full test action name including group prefixes.
   *
   * The kind map is already warm when this is called (ensureKindMap was awaited
   * in getTestActionName). All lookups are synchronous O(1) map reads.
   *
   * @param action - The test action object
   * @param groupName - The name of the parent group (e.g. 'http')
   * @returns The fully qualified action name (e.g. 'http-sendRequest')
   */
  private static resolveTestActionName(action: TestAction, groupName: string): string {
    if (!CitrusTestSchemaService.kindMap) return groupName;

    const jsonRecord = action as Record<string, unknown>;
    for (const key in jsonRecord) {
      if (jsonRecord[key] === undefined) continue;

      const candidateName = `${groupName}-${key}`;
      const kind = CitrusTestSchemaService.kindMap[candidateName];
      if (kind === undefined) continue;

      if (kind === CatalogKind.TestActionGroup) {
        return CitrusTestSchemaService.resolveTestActionName(jsonRecord[key] as TestAction, candidateName);
      }
      return candidateName;
    }
    return groupName;
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
