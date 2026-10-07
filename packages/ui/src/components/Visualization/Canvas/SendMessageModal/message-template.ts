import { IMessageFileBody, MessageBodyType } from '../../../../models/send-message';

interface MessageTemplateBase {
  format: 'kaoto-message';
  version: 1;
  headers: Array<{ key: string; value: string }>;
}

export type MessageTemplate = MessageTemplateBase &
  ({ bodyType: 'text'; body: string } | { bodyType: 'file'; bodyFile: IMessageFileBody });

export interface MessageTemplateDraft {
  bodyType: MessageBodyType;
  body: string;
  bodyFile: IMessageFileBody | null;
  headers: Array<{ key: string; value: string }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseHeaders = (headers: unknown): MessageTemplateBase['headers'] => {
  if (!Array.isArray(headers)) throw new Error('Message headers must be a list of key/value pairs.');
  return headers.map((header: unknown) => {
    if (!isRecord(header) || typeof header.key !== 'string' || typeof header.value !== 'string') {
      throw new Error('Every header must have a string key and value.');
    }
    return { key: header.key, value: header.value };
  });
};

const parseFileBody = (file: unknown): IMessageFileBody => {
  if (!isRecord(file) || typeof file.name !== 'string' || !file.name.trim() || typeof file.content !== 'string') {
    throw new Error('A file body must include its name and base64 content.');
  }
  let size: number;
  try {
    const decoded = atob(file.content);
    if (btoa(decoded) !== file.content) throw new Error('Non-canonical base64');
    size = decoded.length;
  } catch {
    throw new Error('The file body contains invalid base64 content.');
  }
  if (file.type !== undefined && typeof file.type !== 'string') {
    throw new Error('The file MIME type must be a string.');
  }
  if (file.size !== undefined && file.size !== size) {
    throw new Error('The file size does not match its content.');
  }
  return {
    name: file.name,
    content: file.content,
    ...(file.type !== undefined ? { type: file.type } : {}),
    ...(file.size !== undefined ? { size } : {}),
  };
};

export const parseMessageTemplate = (json: string): MessageTemplate => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  if (!isRecord(value) || value.format !== 'kaoto-message') {
    throw new Error('Select a Kaoto message exported with Export message.');
  }
  if (value.version !== 1) throw new Error('This message file version is not supported.');

  const headers = parseHeaders(value.headers);
  const base = { format: 'kaoto-message' as const, version: 1 as const, headers };
  if (value.bodyType === 'text' && typeof value.body === 'string') {
    return { ...base, bodyType: 'text', body: value.body };
  }
  if (value.bodyType === 'file') {
    return { ...base, bodyType: 'file', bodyFile: parseFileBody(value.bodyFile) };
  }
  throw new Error('The message must contain a text or file body.');
};

export const serializeMessageTemplate = (draft: MessageTemplateDraft): string => {
  const template = {
    format: 'kaoto-message',
    version: 1,
    headers: draft.headers.map(({ key, value }) => ({ key, value })),
    ...(draft.bodyType === 'text'
      ? { bodyType: 'text', body: draft.body }
      : { bodyType: 'file', bodyFile: draft.bodyFile }),
  };
  return `${JSON.stringify(parseMessageTemplate(JSON.stringify(template)), null, 2)}\n`;
};
