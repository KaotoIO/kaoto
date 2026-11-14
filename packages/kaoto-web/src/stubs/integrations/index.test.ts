import { getStubIntegrationContent, STUB_INTEGRATION_CONTENT } from '.';

describe('getStubIntegrationContent', () => {
  it('returns the content of a stub integration', () => {
    expect(getStubIntegrationContent('main-flow')).toBe(STUB_INTEGRATION_CONTENT['main-flow']);
  });

  it('returns undefined for an unknown integration', () => {
    expect(getStubIntegrationContent('unknown')).toBeUndefined();
  });

  it.each(['constructor', 'toString', 'hasOwnProperty', '__proto__'])(
    'ignores the inherited property %s',
    (integrationId) => {
      expect(getStubIntegrationContent(integrationId)).toBeUndefined();
    },
  );
});
