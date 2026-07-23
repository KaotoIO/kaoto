import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { stringify } from 'yaml';

import { IClipboardContent } from '../../models/visualization/clipboard';
import { ClipboardService } from './clipboard.service';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    write: vi.fn(),
    read: vi.fn(),
  },
});

// Mock Blob with a .text() implementation so JSDOM's missing Blob.text doesn't break assertions
class MockBlob {
  private readonly content: string;
  readonly type: string;
  constructor(parts: string[], init?: { type?: string }) {
    this.content = parts.join('');
    this.type = init?.type ?? '';
  }
  text(): Promise<string> {
    return Promise.resolve(this.content);
  }
}

// Mock ClipboardItem
Object.defineProperty(globalThis, 'ClipboardItem', {
  writable: true,
  value: class {
    static readonly supports: Mock = vi.fn();
    constructor(public data: Record<string, MockBlob>) {}
  },
});
Object.defineProperty(globalThis, 'Blob', { writable: true, value: MockBlob });

describe('ClipboardService', () => {
  const testContent: IClipboardContent = {
    name: 'to',
    definition: { id: 'to-1913', uri: 'amqp', parameters: {} },
  };
  const expectedYaml = stringify([{ [testContent.name]: testContent.definition }]);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('copy', () => {
    it('writes YAML to text/plain when web text/kaoto is not supported', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      await ClipboardService.copy(testContent);

      expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      expect(await textBlob.text()).toBe(expectedYaml);
      expect(clipboardItem.data[ClipboardService.KAOTO_MIME_TYPE]).toBeUndefined();
    });

    it('writes YAML to both text/plain and web text/kaoto when supported', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(true);

      await ClipboardService.copy(testContent);

      expect(navigator.clipboard.write).toHaveBeenCalledTimes(1);
      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      const kaotoBlob: Blob = clipboardItem.data[ClipboardService.KAOTO_MIME_TYPE];
      expect(await textBlob.text()).toBe(expectedYaml);
      expect(await kaotoBlob.text()).toBe(expectedYaml);
    });

    it('handles errors during copy', async () => {
      vi.spyOn(navigator.clipboard, 'write').mockRejectedValue(new Error('write error'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await ClipboardService.copy(testContent);
      expect(spy).toHaveBeenCalled();
    });

    it('does not wrap root entity errorHandler in array', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const errorHandlerContent: IClipboardContent = {
        name: 'errorHandler',
        definition: { deadLetterChannel: { deadLetterUri: 'log:dlq' } },
      };

      await ClipboardService.copy(errorHandlerContent);

      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      const yaml = await textBlob.text();

      // Should be an object, not an array
      expect(yaml).toBe('errorHandler:\n  deadLetterChannel:\n    deadLetterUri: log:dlq\n');
      expect(yaml).not.toMatch(/^- errorHandler:/);
    });

    it('does not wrap root entity restConfiguration in array', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const restConfigContent: IClipboardContent = {
        name: 'restConfiguration',
        definition: { bindingMode: 'json' },
      };

      await ClipboardService.copy(restConfigContent);

      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      const yaml = await textBlob.text();

      // Should be an object, not an array
      expect(yaml).toBe('restConfiguration:\n  bindingMode: json\n');
      expect(yaml).not.toMatch(/^- restConfiguration:/);
    });

    it('wraps non-entity steps in array', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const stepContent: IClipboardContent = {
        name: 'log',
        definition: { message: 'hello' },
      };

      await ClipboardService.copy(stepContent);

      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      const yaml = await textBlob.text();

      // Should be wrapped in array
      expect(yaml).toBe('- log:\n    message: hello\n');
    });
  });

  describe('paste', () => {
    it('parses YAML from text/plain and returns IClipboardContent', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const blob = { text: vi.fn().mockResolvedValue(expectedYaml) };
      vi.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardService.TEXT_MIME_TYPE],
          getType: vi.fn().mockResolvedValue(blob),
        } as unknown as ClipboardItem,
      ]);

      const result = await ClipboardService.paste();
      expect(result).toEqual(testContent);
    });

    it('parses YAML from web text/kaoto when supported', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(true);

      const blob = { text: vi.fn().mockResolvedValue(expectedYaml) };
      vi.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardService.KAOTO_MIME_TYPE],
          getType: vi.fn().mockResolvedValue(blob),
        } as unknown as ClipboardItem,
      ]);

      const result = await ClipboardService.paste();
      expect(result).toEqual(testContent);
    });

    it('returns null if YAML has no recognisable top-level key', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const blob = { text: vi.fn().mockResolvedValue('just a plain string') };
      vi.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardService.TEXT_MIME_TYPE],
          getType: vi.fn().mockResolvedValue(blob),
        } as unknown as ClipboardItem,
      ]);

      const result = await ClipboardService.paste();
      expect(result).toBeNull();
    });

    it('returns null when clipboard read fails', async () => {
      vi.spyOn(navigator.clipboard, 'read').mockRejectedValue(new Error('read error'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await ClipboardService.paste();
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalled();
    });

    it('returns null if no supported MIME type is present', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(true);
      vi.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: ['application/json'],
          getType: vi.fn(),
        } as unknown as ClipboardItem,
      ]);
      const result = await ClipboardService.paste();
      expect(result).toBeNull();
    });

    it('accepts raw YAML pasted from an external editor', async () => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      const externalYaml = 'to:\n  id: to-external\n  uri: log\n';
      const blob = { text: vi.fn().mockResolvedValue(externalYaml) };
      vi.spyOn(navigator.clipboard, 'read').mockResolvedValue([
        {
          types: [ClipboardService.TEXT_MIME_TYPE],
          getType: vi.fn().mockResolvedValue(blob),
        } as unknown as ClipboardItem,
      ]);

      const result = await ClipboardService.paste();
      expect(result).toEqual({ name: 'to', definition: { id: 'to-external', uri: 'log' } });
    });
  });
});
