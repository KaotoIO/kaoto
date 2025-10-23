import { IClipboardCopyObject } from '../models/visualization/clipboard';
import { updateIds } from './update-ids';

export class ClipboardManager {
  static readonly KAOTO_MIME_TYPE = 'web text/kaoto';
  static readonly TEXT_MIME_TYPE = 'text/plain';
  static readonly KAOTO_MARKER = 'kaoto-node';

  /**
   * Serialize an object into a JSON string and store it in the clipboardContent.
   * @param object The object to serialize.
   */
  static async copy(object: IClipboardCopyObject): Promise<void> {
    try {
      // Add a marker to the object to identify Kaoto-specific content
      const markedObject = {
        ...object,
        __kaoto_marker: ClipboardManager.KAOTO_MARKER,
      };

      const clipboardItemData = {
        [ClipboardManager.TEXT_MIME_TYPE]: new Blob([JSON.stringify(markedObject)], {
          type: ClipboardManager.TEXT_MIME_TYPE,
        }),
      };

      // Check if ClipboardItem.supports() method exists and if it supports our custom MIME type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ('supports' in ClipboardItem && (ClipboardItem as any).supports(ClipboardManager.KAOTO_MIME_TYPE)) {
        Object.assign(clipboardItemData, {
          [ClipboardManager.KAOTO_MIME_TYPE]: new Blob([JSON.stringify(object)], {
            type: ClipboardManager.KAOTO_MIME_TYPE,
          }),
        });
      }

      const clipboardItem = new ClipboardItem(clipboardItemData);
      await navigator.clipboard.write([clipboardItem]);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }

  /**
   * Deserialize the clipboardContent into an object.
   * @returns The deserialized object.
   */
  static async paste(): Promise<IClipboardCopyObject | null> {
    try {
      const clipboardContents = await navigator.clipboard.read();
      for (const item of clipboardContents) {
        if (
          'supports' in ClipboardItem &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ClipboardItem as any).supports(ClipboardManager.KAOTO_MIME_TYPE) &&
          item.types.includes(ClipboardManager.KAOTO_MIME_TYPE)
        ) {
          const blob = await item.getType(ClipboardManager.KAOTO_MIME_TYPE);
          const parsedContent = JSON.parse(await blob.text());
          return updateIds(parsedContent);
        } else if (item.types.includes(ClipboardManager.TEXT_MIME_TYPE)) {
          const blob = await item.getType(ClipboardManager.TEXT_MIME_TYPE);
          const parsedContent = JSON.parse(await blob.text());

          // Validate the marker to ensure it's Kaoto-specific content
          if (parsedContent.__kaoto_marker === ClipboardManager.KAOTO_MARKER) {
            delete parsedContent.__kaoto_marker;
            return updateIds(parsedContent);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch from clipboard:', err);
    }

    return null;
  }
}
