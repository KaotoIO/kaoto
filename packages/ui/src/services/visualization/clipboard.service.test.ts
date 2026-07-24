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

    it.each([
      ['log', { message: 'hello' }, '- log:\n    message: hello\n'],
      ['pipeErrorHandler', { deadLetterChannel: {} }, '- pipeErrorHandler:\n    deadLetterChannel: {}\n'],
      ['nonVisualEntity', { someKey: 'value' }, '- nonVisualEntity:\n    someKey: value\n'],
      ['metadata', { labels: {} }, '- metadata:\n    labels: {}\n'],
    ])('wraps non-entity / internal-type "%s" in array', async (name, definition, expectedOutput) => {
      (ClipboardItem as unknown as { supports: Mock }).supports.mockReturnValueOnce(false);

      await ClipboardService.copy({ name, definition });

      const [[clipboardItemArray]] = (navigator.clipboard.write as Mock).mock.calls;
      const clipboardItem = clipboardItemArray[0];
      const textBlob: Blob = clipboardItem.data[ClipboardService.TEXT_MIME_TYPE];
      const yaml = await textBlob.text();

      expect(yaml).toBe(expectedOutput);
      expect(yaml).toMatch(/^- /);
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

    it('returns null when YAML parses to a non-object value', async () => {
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
  describe('parseYamlToClipboardContent', () => {
    it('returns null for content exceeding 1 MB', () => {
      expect(ClipboardService.parseYamlToClipboardContent('x'.repeat(1024 * 1024 + 1))).toBeNull();
    });

    it('returns null for a single-element array whose item is null', () => {
      // "- ~" parses to [null]; before the fix, Object.keys(null) threw silently
      expect(ClipboardService.parseYamlToClipboardContent('- ~\n')).toBeNull();
    });

    it.each([
      ['YAML with too many aliases (alias bomb)', '*a *a *a *a *a *a *a *a *a *a *a'],
      ['YAML that parses to a non-object (number)', '42'],
      ['array with zero items', '[]'],
      ['array with more than one item', '- foo: 1\n- bar: 2\n'],
      ['array item with multiple keys', '- foo: 1\n  bar: 2\n'],
      ['object with multiple top-level keys', 'foo: 1\nbar: 2\n'],
      [
        'object depth exceeding 20 levels',
        (() => {
          // Build a 21-deep nested object string
          let yaml = 'root:\n';
          let indent = '  ';
          for (let i = 0; i < 21; i++) {
            yaml += `${indent}level${i}:\n`;
            indent += '  ';
          }
          yaml += `${indent}leaf: value\n`;
          return yaml;
        })(),
      ],
    ])('returns null for %s', (_, input) => {
      expect(ClipboardService.parseYamlToClipboardContent(input)).toBeNull();
    });

    it('parses a key with a scalar string value (shorthand step form)', () => {
      // Covers the `to: "kamelet:sink"` shorthand where definition is a string
      const result = ClipboardService.parseYamlToClipboardContent('key: somevalue\n');
      expect(result).toEqual({ name: 'key', definition: 'somevalue' });
    });

    it('defaults definition to {} when YAML value is bare null (key:)', () => {
      // With core schema, "key:" parses to null; ?? {} fires and normalises to {}.
      const result = ClipboardService.parseYamlToClipboardContent('key:\n');
      expect(result).toEqual({ name: 'key', definition: {} });
    });
  });

  describe('sanitizeObject', () => {
    // Helper: create an object with a genuine own-enumerable dangerous key,
    // matching what the YAML parser produces for e.g. `__proto__: evil`.
    // Object.assign and { [key]: ... } literals both have special-case behaviour
    // for __proto__, so Object.defineProperty is needed for reliable own-key creation.
    const withOwnKey = (key: string, value: unknown, extra?: object): object => {
      const obj = Object.defineProperty({}, key, { value, enumerable: true, writable: true, configurable: true });
      return extra ? Object.assign(obj, extra) : obj;
    };

    it.each(['__proto__', 'constructor', 'prototype'])(
      'strips dangerous key "%s" to prevent prototype pollution',
      (dangerousKey) => {
        const input = withOwnKey(dangerousKey, 'evil', { safe: 'ok' });
        const result = ClipboardService.sanitizeObject(input) as Record<string, unknown>;
        // The own key must be gone — use hasOwnProperty because prototype lookups
        // (e.g. Object.prototype.constructor) would still resolve via the chain.
        expect(Object.prototype.hasOwnProperty.call(result, dangerousKey)).toBe(false);
        expect(result['safe']).toBe('ok');
      },
    );

    it('recursively sanitises nested objects', () => {
      const inner = withOwnKey('__proto__', 'evil', { value: 42 });
      const input = { outer: inner };
      const result = ClipboardService.sanitizeObject(input) as { outer: Record<string, unknown> };
      expect(Object.prototype.hasOwnProperty.call(result.outer, '__proto__')).toBe(false);
      expect(result.outer['value']).toBe(42);
    });

    it('recursively sanitises objects inside arrays', () => {
      const item = withOwnKey('__proto__', 'evil', { keep: true });
      const input = [item];
      const result = ClipboardService.sanitizeObject(input) as Array<Record<string, unknown>>;
      expect(Object.prototype.hasOwnProperty.call(result[0], '__proto__')).toBe(false);
      expect(result[0]['keep']).toBe(true);
    });

    it('passes primitive values through unchanged', () => {
      const input = { num: 1, str: 'hello', bool: true, nil: null };
      const result = ClipboardService.sanitizeObject(input) as Record<string, unknown>;
      expect(result).toEqual({ num: 1, str: 'hello', bool: true, nil: null });
    });
  });

  describe('getObjectDepth', () => {
    it('counts array containers as a depth level', () => {
      // [[[]]] — three nested arrays; each array container must add one depth level
      expect(ClipboardService.getObjectDepth([[[]]])).toBe(2);
    });

    it('returns 0 for a flat object', () => {
      expect(ClipboardService.getObjectDepth({ a: 1, b: 'x' })).toBe(0);
    });

    it('returns the correct depth for a nested object', () => {
      const nested = { a: { b: { c: {} } } };
      expect(ClipboardService.getObjectDepth(nested)).toBe(3);
    });

    it('handles arrays of objects and picks the deepest branch', () => {
      // shallow branch depth 1, deep branch depth 2
      const obj = { shallow: { x: 1 }, deep: { a: { b: 1 } } };
      expect(ClipboardService.getObjectDepth(obj)).toBe(2);
    });

    it('respects the depth > 100 safety guard', () => {
      // Build an object 101 levels deep; the guard should cap recursion at 100
      let current: Record<string, unknown> = {};
      const root = current;
      for (let i = 0; i < 101; i++) {
        const next: Record<string, unknown> = {};
        current['child'] = next;
        current = next;
      }
      // Should not throw and should return a value >= 100
      const depth = ClipboardService.getObjectDepth(root);
      expect(depth).toBeGreaterThanOrEqual(100);
    });
  });
});
