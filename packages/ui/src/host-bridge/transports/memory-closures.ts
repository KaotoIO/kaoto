import type { MessageTransport, Unsubscribe } from '../contracts';

// Memory peers can signal closure directly, without adding a wire message or a public transport method.
export const memoryClosures = new WeakMap<MessageTransport, (handler: () => void) => Unsubscribe>();
