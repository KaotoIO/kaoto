import { eventCatalog, requestCatalog } from './contracts';

describe('Send message contracts', () => {
  it('validates target snapshots and rejects invalid process identities', () => {
    const target = { id: 'instance', routeId: 'orders', label: 'orders', pid: 123, state: 'Started' };
    const definition = requestCatalog['editor:sendMessage:getTargets'];
    expect(definition.isResponse({ supported: true, targets: [target] })).toBe(true);
    expect(definition.isResponse({ supported: true, targets: [{ ...target, pid: -1 }] })).toBe(false);
    expect(eventCatalog['host:sendMessage:targetsUpdated'].isPayload({ supported: false, targets: [] })).toBe(true);
  });
  it('rejects malformed message bodies and headers', () => {
    const definition = requestCatalog['editor:sendMessage:send'];
    const request = {
      targetId: 'instance',
      routeId: 'orders',
      payload: { endpoint: 'orders', body: 'hello', headers: { Test: 'value' } },
    };
    expect(definition.isRequest(request)).toBe(true);
    expect(definition.isRequest({ ...request, payload: { ...request.payload, body: 42 } })).toBe(false);
    expect(definition.isRequest({ ...request, payload: { ...request.payload, headers: { Test: 42 } } })).toBe(false);
  });
});
