export const readFileAsString = (file: File): Promise<string> => {
  return file.text();
};
