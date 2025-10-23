import { ClipboardManager } from './ClipboardManager';
import { updateIds } from './update-ids';
import { IClipboardCopyObject } from '../models/visualization/clipboard';
import { SourceSchemaType } from '../models/camel/source-schema-type';

// Mock the `updateIds` function
jest.mock('./update-ids', () => ({
  updateIds: jest.fn((node) => node),
}));

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    write: jest.fn(),
    read: jest.fn(),
  },
});

// Mock the ClipboardItem
// Mocking ClipboardItem.supports
Object.defineProperty(window, 'ClipboardItem', {
  writable: true,
  value: class {
    static supports: jest.Mock = jest.fn();
    constructor() {}
  },
});

describe('ClipboardManager', () => {
  const testClipboardObject: IClipboardCopyObject = {
    name: 'exampleNode',
    definition: { id: 'node1', type: 'exampleType' },
    type: SourceSchemaType.Route,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copy', () => {
    it('should copy only TEXT_MIME_TYPE content to the clipboard', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(false);

      const markedObject = {
        ...testClipboardObject,
        __kaoto_marker: ClipboardManager.KAOTO_MARKER,
      };
      const clipboardItemData = {
        [ClipboardManager.TEXT_MIME_TYPE]: new Blob([JSON.stringify(markedObject)], {
          type: ClipboardManager.TEXT_MIME_TYPE,
        }),
      };
      await ClipboardManager.copy(testClipboardObject);
      expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.write).toHaveBeenCalledWith([new ClipboardItem(clipboardItemData)]);
    });

    it('should copy both TEXT_MIME_TYPE & KAOTO_MIME_TYPE content to the clipboard', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(true);

      const markedObject = {
        ...testClipboardObject,
        __kaoto_marker: ClipboardManager.KAOTO_MARKER,
      };
      const clipboardItemData = {
        [ClipboardManager.KAOTO_MIME_TYPE]: new Blob([JSON.stringify(markedObject)], {
          type: ClipboardManager.KAOTO_MIME_TYPE,
        }),
        [ClipboardManager.TEXT_MIME_TYPE]: new Blob([JSON.stringify(markedObject)], {
          type: ClipboardManager.TEXT_MIME_TYPE,
        }),
      };
      await ClipboardManager.copy(testClipboardObject);
      expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
      expect(navigator.clipboard.write).toHaveBeenCalledWith([new ClipboardItem(clipboardItemData)]);
    });

    it('should handle errors during copy', async () => {
      jest.spyOn(navigator.clipboard, 'write').mockRejectedValue(new Error('Clipboard write error'));
      const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

      await ClipboardManager.copy(testClipboardObject);

      expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe('paste', () => {
    it('should fetch from the TEXT_MIME_TYPE content from the clipboard', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(false);

      const clipboardContent = {
        ...testClipboardObject,
        __kaoto_marker: ClipboardManager.KAOTO_MARKER,
      };

      // Mock the Blob object with a `text()` method
      const blob = {
        text: jest.fn().mockResolvedValue(JSON.stringify(clipboardContent)),
      };

      jest.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardManager.TEXT_MIME_TYPE],
          getType: jest.fn().mockResolvedValue(blob),
        },
      ]);

      const result = await ClipboardManager.paste();
      expect(navigator.clipboard.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updateIds(testClipboardObject));
    });

    it('should fetch fm the KAOTO_MIME_TYPE content from the clipboard', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(true);

      // Mock the Blob object with a `text()` method
      const blob = {
        text: jest.fn().mockResolvedValue(JSON.stringify(testClipboardObject)),
      };

      jest.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardManager.KAOTO_MIME_TYPE],
          getType: jest.fn().mockResolvedValue(blob),
        },
        {
          types: [ClipboardManager.TEXT_MIME_TYPE],
          getType: jest.fn().mockResolvedValue(blob),
        },
      ]);

      const result = await ClipboardManager.paste();
      expect(navigator.clipboard.read).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updateIds(testClipboardObject));
    });

    it('should return null if clipboard content is not Kaoto-specific', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(false);

      // Mock the Blob object with a `text()` method
      const blob = {
        text: jest.fn().mockResolvedValue(JSON.stringify(testClipboardObject)),
      };

      jest.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardManager.TEXT_MIME_TYPE],
          getType: jest.fn().mockResolvedValue(blob),
        },
      ]);

      const result = await ClipboardManager.paste();
      expect(navigator.clipboard.read).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(updateIds).not.toHaveBeenCalled();
    });

    it('should handle errors during paste', async () => {
      jest.spyOn(navigator.clipboard, 'read').mockRejectedValue(new Error('Clipboard read error'));
      const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await ClipboardManager.paste();
      expect(result).toBeNull();
      expect(consoleErrorMock).toHaveBeenCalled();
    });

    it('should return null if clipboard content does not include the MIME type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ClipboardItem as any).supports as jest.Mock).mockReturnValueOnce(true);

      jest.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: ['application/json'],
          getType: jest.fn(),
        },
      ]);

      const result = await ClipboardManager.paste();
      expect(navigator.clipboard.read).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
      expect(updateIds).not.toHaveBeenCalled();
    });
  });
});
