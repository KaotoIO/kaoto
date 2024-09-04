export const generateRandomId = (kind: string, length = 4): string => {
  const randomNumber = Math.floor(Math.random() * 10 ** length);
  const randomNumberString = randomNumber.toString(10).padStart(length, '0');
  return `${kind}-${randomNumberString}`;
};
