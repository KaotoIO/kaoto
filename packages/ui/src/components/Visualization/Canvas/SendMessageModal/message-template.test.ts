import { describe, expect, it } from 'vitest';

import { parseMessageTemplate, serializeMessageTemplate } from './message-template';

const textTemplate = {
  format: 'kaoto-message',
  version: 1,
  bodyType: 'text',
  body: '{"hello":"世界"}',
  headers: [{ key: 'Content-Type', value: 'application/json' }],
};

describe('message templates', () => {
  it('round-trips text and header entries without target or UI state', () => {
    const draft = {
      bodyType: 'text' as const,
      body: textTemplate.body,
      bodyFile: null,
      endpoint: 'direct:original',
      headers: [{ id: 'ui-id', ...textTemplate.headers[0] }],
    };
    expect(parseMessageTemplate(serializeMessageTemplate(draft))).toEqual(textTemplate);
    expect(serializeMessageTemplate(draft)).not.toContain('direct:original');
    expect(serializeMessageTemplate(draft)).not.toContain('ui-id');
  });

  it('round-trips all file bytes and metadata without the source file', () => {
    const bodyFile = { name: 'payload.bin', content: 'AP+A', type: 'application/octet-stream', size: 3 };
    const serialized = serializeMessageTemplate({ bodyType: 'file', body: 'inactive text', bodyFile, headers: [] });
    expect(parseMessageTemplate(serialized)).toEqual({
      format: 'kaoto-message',
      version: 1,
      bodyType: 'file',
      bodyFile,
      headers: [],
    });
    expect(serialized).not.toContain('inactive text');
  });

  it('supports empty text, empty files, and false/zero header values as strings', () => {
    const headers = [
      { key: 'flag', value: 'false' },
      { key: 'count', value: '0' },
    ];
    expect(parseMessageTemplate(JSON.stringify({ ...textTemplate, body: '', headers })).headers).toEqual(headers);
    const draft = {
      bodyType: 'file' as const,
      body: '',
      bodyFile: { name: 'empty.txt', content: '', size: 0 },
      headers,
    };
    expect(parseMessageTemplate(serializeMessageTemplate(draft))).toMatchObject({ bodyFile: draft.bodyFile, headers });
  });

  it('drops endpoint and extra properties from imported templates', () => {
    expect(parseMessageTemplate(JSON.stringify({ ...textTemplate, endpoint: 'direct:old', extra: true }))).toEqual(
      textTemplate,
    );
  });

  it.each([
    null,
    [],
    {},
    { ...textTemplate, format: 'other' },
    { ...textTemplate, version: 2 },
    { ...textTemplate, bodyType: 'unknown' },
    { ...textTemplate, body: 123 },
    { ...textTemplate, headers: {} },
    { ...textTemplate, headers: [null] },
    { ...textTemplate, headers: [{ key: 'flag', value: true }] },
    { ...textTemplate, headers: [{ key: 1, value: 'value' }] },
    { ...textTemplate, bodyType: 'file' },
    { ...textTemplate, bodyType: 'file', bodyFile: { name: '', content: '' } },
    { ...textTemplate, bodyType: 'file', bodyFile: { name: 'x', content: '@@' } },
    { ...textTemplate, bodyType: 'file', bodyFile: { name: 'x', content: 'AP+A', size: 2 } },
    { ...textTemplate, bodyType: 'file', bodyFile: { name: 'x', content: '', size: -1 } },
    { ...textTemplate, bodyType: 'file', bodyFile: { name: 'x', content: '', type: 1 } },
  ])('rejects invalid templates: %j', (value) => {
    expect(() => parseMessageTemplate(JSON.stringify(value))).toThrow();
  });

  it('rejects malformed JSON and a file draft without a selected file', () => {
    expect(() => parseMessageTemplate('{')).toThrow();
    expect(() => serializeMessageTemplate({ bodyType: 'file', body: '', bodyFile: null, headers: [] })).toThrow();
  });
});
