const getCryptoObj = () => {
  return window.crypto || (window as Window & { msCrypto?: Crypto }).msCrypto;
};

export const getCamelRandomId = (kind: string, length = 4): string => {
  const randomNumber = Math.floor(getCryptoObj()?.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

  return `${kind}-${randomNumber.toString(10).slice(0, length)}`;
};

export const getHexaDecimalRandomId = (prefix: string) => {
  const randomNumber = getCryptoObj()?.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  return `${prefix}-${randomNumber.toString(16)}`;
};

/** Example from https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest */
export const getObjectHash = async (object: unknown): Promise<string> => {
  const objUint8 = new TextEncoder().encode(JSON.stringify(object));
  const subtle = getCryptoObj().subtle;
  const hashBuffer = await subtle.digest('SHA-1', objUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};
