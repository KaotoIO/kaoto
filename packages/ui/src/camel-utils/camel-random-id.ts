export const getCamelRandomId = (kind: string, length = 4): string => {
  const cryptoObj = window.crypto || (window as Window & { msCrypto?: Crypto }).msCrypto;
  const randomNumber = Math.floor(cryptoObj?.getRandomValues(new Uint32Array(1))[0] ?? Date.now());

  return `${kind}-${randomNumber.toString(10).slice(0, length)}`;
};
