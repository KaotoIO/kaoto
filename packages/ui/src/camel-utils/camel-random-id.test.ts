import { getCamelRandomId, getHexaDecimalRandomId } from './camel-random-id';

describe('camel-random-id', () => {
  it('should return a random number', () => {
    expect(getCamelRandomId('route')).toEqual(expect.any(String));
  });

  it('should return a random number with a given length', () => {
    jest
      .spyOn(global, 'crypto', 'get')
      .mockImplementationOnce(() => ({ getRandomValues: () => [19508888] }) as unknown as Crypto);
    expect(getCamelRandomId('route', 6)).toEqual('route-195088');
  });

  it('should return a random number using Date.now() if crypto module is not available', () => {
    Object.defineProperty(global, 'msCrypto', {
      value: undefined,
      writable: true,
    });
    jest.spyOn(global, 'crypto', 'get').mockImplementationOnce(() => undefined as unknown as Crypto);
    jest.spyOn(global.Date, 'now').mockReturnValueOnce(888);

    const result = getCamelRandomId('route');

    expect(result).toEqual('route-888');
  });

  it('should return a random number using msCrypto if crypto module is not available', () => {
    Object.defineProperty(global, 'msCrypto', {
      value: global.crypto,
      writable: true,
    });

    jest.spyOn(global, 'crypto', 'get').mockImplementationOnce(() => undefined as unknown as Crypto);

    expect(getCamelRandomId('route')).toEqual(expect.any(String));
  });

  describe('getHexaDecimalRandomId()', () => {
    it('should return a random number with Hexadecimal format', async () => {
      // crypto.getRandomValues() in Jest returns a fixed number 12345678. Replacing with Date.now()
      jest
        .spyOn(global, 'crypto', 'get')
        .mockImplementation(() => ({ getRandomValues: () => [Date.now()] }) as unknown as Crypto);
      const one = getHexaDecimalRandomId('test');
      expect(one).toMatch(/test-[0-9a-f]{1,8}/);
      await new Promise((f) => setTimeout(f, 1));
      const two = getHexaDecimalRandomId('test');
      expect(two).toMatch(/test-[0-9a-f]{1,8}/);
      expect(one).not.toEqual(two);
    });
  });
});
