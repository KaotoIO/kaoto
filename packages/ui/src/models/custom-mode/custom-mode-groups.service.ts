import { IBobComponentDefinition } from '../bob/bob-catalog';
import { BOB_CUSTOM_MODE_ROOT_ENTITY_NAME } from '../bob/bob-catalog-index';
import { CatalogKind } from '../catalog-kind';
import { CamelCatalogService } from '../visualization/flows/camel-catalog.service';
import { CustomMode, CustomModeGroup } from './custom-mode-types';

/**
 * Pattern that matches a Bob catalog node reference inside a `customInstructions`
 * string in either bold (`**name**`) or inline-code (`` `name` ``) form.
 * Identifiers may contain letters, digits, underscores, and hyphens (e.g. `text-node`).
 */
const NODE_REFERENCE_RE = /\*\*([A-Za-z][A-Za-z0-9_-]*)\*\*|`([A-Za-z][A-Za-z0-9_-]*)`/g;

export class CustomModeGroupsService {
  /**
   * Returns the deduplicated list of group names required by the given catalog
   * node names, derived live from the loaded Bob catalog.
   * Unknown names are silently ignored.
   */
  static getRequiredGroups(nodeNames: string[]): string[] {
    const groups = new Set<string>();
    for (const name of nodeNames) {
      for (const g of CustomModeGroupsService.getNodeGroupsFromCatalog(name)) {
        groups.add(g);
      }
    }
    return Array.from(groups);
  }

  /**
   * Scans a raw `customInstructions` string and returns every catalog node name
   * that appears as a bold or inline-code reference and is present in the Bob catalog.
   */
  static extractNodeNames(customInstructions: string): string[] {
    const found = new Set<string>();
    const re = new RegExp(NODE_REFERENCE_RE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(customInstructions)) !== null) {
      const candidate = match[1] ?? match[2];
      if (candidate && CustomModeGroupsService.getNodeGroupsFromCatalog(candidate).length > 0) {
        found.add(candidate);
      }
    }
    return Array.from(found);
  }

  /**
   * Ensures every group required by the given catalog node is present in `mode.groups`.
   * Missing groups are appended in the order defined by the modes catalog enum.
   * Groups not in the enum are appended after all enum-ordered ones.
   * Existing groups are never removed or reordered.
   */
  static syncGroupsForNode(nodeName: string, mode: CustomMode): void {
    const required = CustomModeGroupsService.getRequiredGroups([nodeName]);
    if (required.length === 0) return;

    const existing = new Set<string>(mode.groups.map((g) => (Array.isArray(g) ? g[0] : g)));

    const missing = required.filter((g) => !existing.has(g));
    if (missing.length === 0) return;

    const enumOrder = CustomModeGroupsService.getGroupsEnumOrder();
    const enumIndex = (g: string): number => {
      const i = enumOrder.indexOf(g);
      return i === -1 ? enumOrder.length : i;
    };
    missing.sort((a, b) => enumIndex(a) - enumIndex(b));

    for (const group of missing) {
      (mode.groups as CustomModeGroup[]).push(group);
    }
  }

  /**
   * Returns the set of permission groups required by the named catalog node.
   * Looks up `group` (comma-separated) on the `bobTool` or `bobComponent` entry.
   * Returns an empty array when the name is not in either catalog.
   */
  private static getNodeGroupsFromCatalog(nodeName: string): string[] {
    const entry: IBobComponentDefinition | undefined =
      CamelCatalogService.getComponent(CatalogKind.BobTool, nodeName) ??
      CamelCatalogService.getComponent(CatalogKind.BobComponent, nodeName);

    if (!entry?.group) return [];
    return entry.group
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  }

  /**
   * Returns the canonical group insertion order derived from the `groups.items.enum`
   * in the Bob modes catalog (`bob-catalog-aggregate-modes.json`).
   * Falls back to an empty array when the catalog is not yet loaded.
   */
  private static getGroupsEnumOrder(): string[] {
    const rootSchema = CamelCatalogService.getComponent(
      CatalogKind.Entity,
      BOB_CUSTOM_MODE_ROOT_ENTITY_NAME,
    )?.propertiesSchema;
    const items = (rootSchema?.properties?.['groups'] as Record<string, unknown> | undefined)?.['items'] as
      | Record<string, unknown>
      | undefined;
    const enumValues = items?.['enum'];
    return Array.isArray(enumValues) ? (enumValues as string[]) : [];
  }
}
