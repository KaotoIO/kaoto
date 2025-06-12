import { IClipboardCopyObject } from '../components/Visualization/Custom/hooks/copy-step.hook';
import { updateIds } from './update-ids';

export class ClipboardManager {
  static readonly MIME_TYPE = 'text/plain';
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
        [ClipboardManager.MIME_TYPE]: new Blob([JSON.stringify(markedObject)], {
          type: ClipboardManager.MIME_TYPE,
        }),
      };
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
        if (item.types.includes(ClipboardManager.MIME_TYPE)) {
          const blob = await item.getType(ClipboardManager.MIME_TYPE);
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
