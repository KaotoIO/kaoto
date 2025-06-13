import { IClipboardCopyObject } from '../components/Visualization/Custom/hooks/copy-step.hook';
import { updateIds } from './update-ids';

export class ClipboardManager {
  private static clipboardContent: string | null = null;

  /**
   * Serialize an object into a JSON string and store it in the clipboardContent.
   * @param object The object to serialize.
   */
  static copy(object: IClipboardCopyObject): void {
    try {
      this.clipboardContent = JSON.stringify(object);
      navigator.clipboard.writeText(this.clipboardContent);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      throw new Error('Clipboard copy failed');
    }
  }

  /**
   * Deserialize the clipboardContent into an object.
   * @returns The deserialized object.
   */
  static paste(): IClipboardCopyObject | null {
    if (!this.clipboardContent) {
      return null;
    }

    try {
      return updateIds(JSON.parse(this.clipboardContent)) as IClipboardCopyObject;
    } catch (err) {
      console.error('Failed to deserialize clipboard content:', err);
      throw new Error('Clipboard paste failed');
    }
  }

  static getClipboardContent(): IClipboardCopyObject | null {
    if (!this.clipboardContent) {
      return null;
    }

    return JSON.parse(this.clipboardContent);
  }
}
