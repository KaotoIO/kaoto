const getCryptoObj = () => {
  return globalThis.crypto || (globalThis as typeof globalThis & { msCrypto?: Crypto }).msCrypto;
};

export const getCamelRandomId = (kind: string, length = 4): string => {
  const randomNumber = Math.floor(getCryptoObj()?.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

  return `${kind}-${randomNumber.toString(10).slice(0, length)}`;
};

export const getHexaDecimalRandomId = (prefix: string) => {
  const randomNumber = getCryptoObj()?.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  return `${prefix}-${randomNumber.toString(16)}`;
};
