import { parse, stringify } from 'yaml';

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

  // Top-level entity types that should not be wrapped in an array
  // Includes all canonical Camel root entity names
  private static readonly ENTITY_TYPES = [
    'route',
    'pipe',
    'kamelet',
    'template',
    'test',
    'beans',
    'errorHandler',
    'restConfiguration',
    'rest',
    'routeConfiguration',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onCompletion',
    'onException',
    'kameletBinding',
    'integration',
  ];

  /**
   * Serialise content to YAML and write it to the clipboard.
   * Writes to text/plain always; also to web text/kaoto on Chrome.
   */
  static async copy(content: IClipboardContent): Promise<void> {
    try {
      // Only wrap steps/components in array (to get the leading dash)
      // Top-level entities (route, pipe, kamelet, etc.) should be plain objects
      const isEntity = this.ENTITY_TYPES.includes(content.name);
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
      const parsed = parse(text);
      if (!parsed || typeof parsed !== 'object') return null;

      // Handle array format: [{ stepName: { ... } }]
      if (Array.isArray(parsed)) {
        if (parsed.length !== 1 || typeof parsed[0] !== 'object' || Array.isArray(parsed[0])) {
          return null;
        }
        const keys = Object.keys(parsed[0]);
        if (keys.length !== 1) return null;
        const name = keys[0];
        const definition = (parsed[0] as Record<string, object>)[name];
        return { name, definition: definition ?? {} };
      }

      // Handle object format: { stepName: { ... } }
      const keys = Object.keys(parsed);
      if (keys.length !== 1) return null;

      const name = keys[0];
      const definition = (parsed as Record<string, object>)[name];
      return { name, definition: definition ?? {} };
    } catch {
      return null;
    }
  }
}
