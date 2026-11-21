import type { ICamelMessagePayload } from './send-message';

export interface SendMessageTarget {
  id: string;
  routeId: string;
  label: string;
  pid: number | null;
  state: string;
}

export interface SendMessageRuntimeSnapshot {
  supported: boolean;
  targets: SendMessageTarget[];
}

export interface SendMessageRequest {
  targetId: string;
  routeId: string;
  payload: ICamelMessagePayload;
}
