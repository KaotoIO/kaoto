export const readFileAsString = (file: File): Promise<string> => {
  return file.text();
};

// Test helper to create a File with mocked .text() for JSDOM (which lacks File.text())
export const createFile = (content: string, name: string) => {
  const file = new File([content], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', {
    value: () => Promise.resolve(content),
    configurable: true,
  });
  return file;
};
