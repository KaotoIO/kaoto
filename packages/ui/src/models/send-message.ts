import type { SendMessageTarget } from './send-message-runtime';

export interface IHeaderEntry {
  id: string;
  key: string;
  value: string;
}

export type MessageBodyType = 'text' | 'file';

export interface IMessageFileBody {
  name: string;
  content: string; // base64
  type?: string;
  size?: number;
}

export interface ICamelMessagePayload {
  endpoint: string;
  body?: string;
  bodyType?: MessageBodyType;
  bodyEncoding?: string;
  bodyFile?: IMessageFileBody;
  headers?: Record<string, string>;
}

export interface ISendMessageModalOptions {
  endpoint: string;
  title?: string;
  subtitle?: string;
  initialBody?: string;
  initialHeaders?: Array<{ key: string; value: string }>;
  targets?: SendMessageTarget[];
  onSend?: (payload: ICamelMessagePayload, targetId?: string) => Promise<void> | void;
}
