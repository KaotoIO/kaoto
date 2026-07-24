import { parse, stringify } from 'yaml';

import { EntityType } from '../../models/entities/base-entity';
import { IClipboardContent } from '../../models/visualization/clipboard';

// Extend ClipboardItem to include the supports method
interface ClipboardItemConstructor {
  new (items: Record<string, Blob>): ClipboardItem;
  supports?(type: string): boolean;
}

declare const ClipboardItem: ClipboardItemConstructor;

export class ClipboardService {
  static readonly KAOTO_MIME_TYPE = 'web text/kaoto';
  static readonly TEXT_MIME_TYPE = 'text/plain';

  /**
   * Internal-only EntityType values with no YAML representation.
   * When a new internal-only type is added to EntityType, add it here too.
   */
  private static readonly INTERNAL_ENTITY_TYPES = new Set<EntityType>([
    EntityType.PipeErrorHandler,
    EntityType.NonVisualEntity,
    EntityType.Metadata,
  ]);

  /**
   * All EntityType values that map to a real YAML root key.
   * Automatically stays in sync: any new EntityType entry is included here
   * unless it is also listed in INTERNAL_ENTITY_TYPES above.
   * NOTE: must be declared after INTERNAL_ENTITY_TYPES — it references it in the initialiser.
   */
  private static readonly ENTITY_TYPES: ReadonlySet<string> = new Set(
    Object.values(EntityType).filter((t) => !ClipboardService.INTERNAL_ENTITY_TYPES.has(t)),
  );

  /**
   * Serialise content to YAML and write it to the clipboard.
   * Writes to text/plain always; also to web text/kaoto on Chrome.
   */
  static async copy(content: IClipboardContent): Promise<void> {
    try {
      // Only wrap steps/components in array (to get the leading dash)
      // Top-level entities (route, pipe, kamelet, etc.) should be plain objects
      const isEntity = this.ENTITY_TYPES.has(content.name);
      const yamlString = isEntity
        ? stringify({ [content.name]: content.definition })
        : stringify([{ [content.name]: content.definition }]);

      const clipboardItemData: Record<string, Blob> = {
        [ClipboardService.TEXT_MIME_TYPE]: new Blob([yamlString], {
          type: ClipboardService.TEXT_MIME_TYPE,
        }),
      };

      if ('supports' in ClipboardItem && ClipboardItem.supports?.(ClipboardService.KAOTO_MIME_TYPE)) {
        clipboardItemData[ClipboardService.KAOTO_MIME_TYPE] = new Blob([yamlString], {
          type: ClipboardService.KAOTO_MIME_TYPE,
        });
      }

      await navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  /**
   * Determine the best MIME type to read from a clipboard item.
   * Prefers web text/kaoto if supported, falls back to text/plain.
   */
  private static getBestMimeType(item: ClipboardItem): string | null {
    const supportsKaotoMimeType =
      'supports' in ClipboardItem &&
      ClipboardItem.supports?.(ClipboardService.KAOTO_MIME_TYPE) &&
      item.types.includes(ClipboardService.KAOTO_MIME_TYPE);

    if (supportsKaotoMimeType) {
      return ClipboardService.KAOTO_MIME_TYPE;
    }

    if (item.types.includes(ClipboardService.TEXT_MIME_TYPE)) {
      return ClipboardService.TEXT_MIME_TYPE;
    }

    return null;
  }

  /**
   * Read YAML from the clipboard and return an IClipboardContent.
   * Returns null if no valid YAML with a recognisable top-level key is found.
   */
  static async paste(): Promise<IClipboardContent | null> {
    try {
      const clipboardContents = await navigator.clipboard.read();
      for (const item of clipboardContents) {
        const mimeType = ClipboardService.getBestMimeType(item);

        if (!mimeType) continue;

        const blob = await item.getType(mimeType);
        const text = await blob.text();
        const parsed = ClipboardService.parseYamlToClipboardContent(text);
        if (parsed) return parsed;
      }
    } catch (err) {
      console.error('Failed to fetch from clipboard:', err);
    }

    return null;
  }

  /**
   * Parse a YAML string into an IClipboardContent.
   * The YAML can be either:
   * - An array with a single object containing one key (Kaoto format)
   * - An object with exactly one top-level key (external YAML)
   * Returns null if parsing fails or the structure is unrecognisable.
   */
  static parseYamlToClipboardContent(text: string): IClipboardContent | null {
    try {
      // 1. Size limit (prevent memory exhaustion)
      const MAX_CLIPBOARD_SIZE = 1024 * 1024; // 1MB
      if (text.length > MAX_CLIPBOARD_SIZE) {
        throw new Error(`Clipboard content too large (${text.length} bytes, max ${MAX_CLIPBOARD_SIZE})`);
      }
      // 2. Safe parsing with limits
      const parsed = parse(text, {
        maxAliasCount: 10,
        schema: 'core',
        strict: true,
      });
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      // 3. Validate object depth (prevent stack overflow)
      const MAX_DEPTH = 20;
      if (this.getObjectDepth(parsed) > MAX_DEPTH) {
        throw new Error(`YAML structure too deep (max ${MAX_DEPTH} levels)`);
      }

      // 4. Sanitize to prevent prototype pollution
      const sanitized = this.sanitizeObject(parsed);

      // 5. Validate structure
      if (Array.isArray(sanitized)) {
        if (sanitized.length !== 1 || sanitized[0] === null || typeof sanitized[0] !== 'object') {
          throw new Error('Invalid array format');
        }
        const keys = Object.keys(sanitized[0]);
        if (keys.length !== 1) {
          throw new Error(`Expected single key, found ${keys.length}`);
        }
        const name = keys[0];
        const definition = sanitized[0][name];
        return { name, definition: definition ?? {} };
      }

      const keys = Object.keys(sanitized);
      if (keys.length !== 1) {
        throw new Error(`Expected single key, found ${keys.length}: ${keys.join(', ')}`);
      }

      const name = keys[0];
      const definition = (sanitized as Record<string, unknown>)[name];
      return { name, definition: definition ?? {} };
    } catch {
      return null;
    }
  }

  // Helper: Calculate object depth
  static getObjectDepth(obj: object, depth = 0): number {
    if (depth > 100) return depth; // Safety limit

    if (Array.isArray(obj)) {
      return Math.max(
        depth,
        ...obj.map((v) => (v && typeof v === 'object' ? this.getObjectDepth(v, depth + 1) : depth)),
      );
    }
    const depths = Object.values(obj).map((v) =>
      v && typeof v === 'object' ? this.getObjectDepth(v, depth + 1) : depth,
    );
    return Math.max(depth, ...depths);
  }

  // Helper: Sanitize object to prevent prototype pollution
  static sanitizeObject(obj: object): object {
    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => (item && typeof item === 'object' ? this.sanitizeObject(item) : item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = value && typeof value === 'object' ? this.sanitizeObject(value) : value;
    }
    return sanitized;
  }
}
