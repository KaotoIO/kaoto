import { CatalogKind } from '../../../catalog-kind';
import { TestAction, TestActions } from '../../../citrus/entities/Test';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { ICitrusComponentDefinition } from '../../../test-catalog';
import { CamelCatalogService } from '../camel-catalog.service';

export class CitrusTestSchemaService {
  static getNodeSchema(name: string, action?: TestAction): KaotoSchemaDefinition['schema'] | undefined {
    if (action === undefined) {
      return undefined;
    }

    const definition = this.getTestActionDefinition(name);
    return definition?.propertiesSchema || ({} as KaotoSchemaDefinition['schema']);
  }

  static getNodeTitle(name: string): string {
    return this.getTestActionDefinition(name)?.title ?? name;
  }

  static getTooltipContent(name: string, action: TestAction): string {
    const description = action?.description;
    if (description) {
      return description;
    }

    return this.getTestActionDefinition(name)?.description ?? name;
  }

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

        if (definition.kind == CatalogKind.TestActionGroup) {
          return this.resolveTestActionName(jsonRecord[key] as TestAction, definition);
        }

        return key;
      }
    }

    return name;
  }

  static getTestActionDefinition(actionName: string): ICitrusComponentDefinition | undefined {
    const actionDef: ICitrusComponentDefinition | undefined =
      CamelCatalogService.getComponent(CatalogKind.TestAction, actionName) ??
      CamelCatalogService.getComponent(CatalogKind.TestContainer, actionName);

    if (!actionDef) {
      return undefined;
    }

    if (actionDef.group !== undefined) {
      this.resolveTestActionGroup(actionDef.group, actionDef);
    }

    return actionDef;
  }

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
      case 'wait':
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
    let groupDef: ICitrusComponentDefinition | undefined = CamelCatalogService.getComponent(
      CatalogKind.TestAction,
      group,
    );

    if (groupDef?.group !== undefined) {
      groupDef = this.resolveTestActionGroup(groupDef.group, groupDef);
    }

    if (actionDef.propertiesSchema) {
      const schemaProperties =
        actionDef.propertiesSchema?.properties || ({} as Record<string, KaotoSchemaDefinition['schema']>);
      for (const propertiesKey in groupDef?.propertiesSchema?.properties) {
        schemaProperties[propertiesKey] = groupDef?.propertiesSchema?.properties[propertiesKey];
      }
      actionDef.propertiesSchema.properties = schemaProperties;
    } else {
      actionDef.propertiesSchema = groupDef?.propertiesSchema;
    }

    return actionDef;
  }

  static extractTestActionName(path: string) {
    return path.split('.').pop() ?? '';
  }

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
